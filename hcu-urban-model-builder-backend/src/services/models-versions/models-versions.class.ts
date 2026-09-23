// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Id, Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type {
  ModelsVersionsExport,
  ModelsVersionsImport,
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsJoinChannelData,
  ModelsVersionsLeaveChannelData,
  ModelsVersionsPatch,
  ModelsVersionsQuery
} from './models-versions.schema.js'
import { isServerCall } from '../../utils/is-server-call.js'
import { Nodes, nodesDataSchema } from '../nodes/nodes.schema.js'
import { Edges, edgesDataSchema } from '../edges/edges.schema.js'
import { Scenarios, scenariosDataSchema } from '../scenarios/scenarios.schema.js'
import {
  ScenarioValues,
  scenarioValuesDataSchema
} from '../scenarios-values/scenarios-values.schema.js'
import { BadRequest } from '@feathersjs/errors'
import _ from 'lodash'
import {
  findAllEdges,
  findAllNodes,
  findAllScenarios,
  findAllScenarioValues
} from '../../shared/graph-queries.js'

export type { ModelsVersions, ModelsVersionsData, ModelsVersionsPatch, ModelsVersionsQuery }

export interface ModelsVersionsParams extends KnexAdapterParams<ModelsVersionsQuery> {}

export interface ModelsVersionsServiceOptions extends KnexAdapterOptions {
  app: Application
}

type ExportedScenario = {
  scenario: Scenarios
  scenarioValues: ScenarioValues[]
}

type ExportedModelVersionPayload = {
  schemaVersion: 1
  exportedAt: string
  modelVersion: ModelsVersions
  nodes: Nodes[]
  edges: Edges[]
  scenarios: ExportedScenario[]
}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ModelsVersionsService<ServiceParams extends Params = ModelsVersionsParams> extends KnexService<
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsParams,
  ModelsVersionsPatch
> {
  app: Application

  constructor(options: ModelsVersionsServiceOptions) {
    super(options)
    this.app = options.app
  }

  createQuery(params: KnexAdapterParams<ModelsVersionsQuery>) {
    const query = super.createQuery(params as any)
    // ignore when isTouch is true, because then we only patch the updatedAt field, no need to join
    if (params.isTouch || (isServerCall(params) && !params?.user?.id)) {
      return query
    }

    if (!params?.user?.id) {
      throw new Error(
        'ModelsVersionsService:createQuery: params.user.id is required but not set. Probably missing authentication.'
      )
    }
    const raw = query.client.raw
    // join on models_users to get the role of the user
    query.leftJoin('models_users as models_users', function () {
      this.on('models_versions.modelId', '=', 'models_users.modelId').andOn(
        'models_users.userId',
        '=',
        raw('?', [params?.user?.id])
      )
    })
    // join on models to get the model name
    query.leftJoin('models as models', 'models.id', 'models_versions.modelId')
    // select role as extra field
    query.select('models_users.role as role')
    return query
  }

  _get(id: Id, params?: ModelsVersionsParams | undefined) {
    return super._get(id, params)
  }

  async joinChannel(data: ModelsVersionsJoinChannelData, params?: ModelsVersionsParams) {
    if (!params?.connection) {
      throw new Error('Can not join channel because params.connection is required but not set.')
    }

    this.app.channel(`model-versions:${data.id}`).join(params.connection)
    return { id: data.id }
  }

  async leaveChannel(data: ModelsVersionsLeaveChannelData, params?: ModelsVersionsParams) {
    if (!params?.connection) {
      throw new Error('Can not leave channel because params.connection is required but not set.')
    }

    this.app.channel(`model-versions:${data.id}`).leave(params.connection)
    return { id: data.id }
  }

  async exportVersion(data: ModelsVersionsExport) {
    const modelVersion = await this._get(data.id)
    // Export a single version as a portable graph package. This is used both
    // for backups and as the input format for importing into a fresh draft.
    const nodes = await findAllNodes(this.app, modelVersion.id)
    const edges = await findAllEdges(this.app, modelVersion.id)
    const scenarios = await findAllScenarios(this.app, modelVersion.id)

    const exportedScenarios = await Promise.all(
      scenarios.map(async (scenario) => ({
        scenario,
        scenarioValues: await findAllScenarioValues(this.app, scenario.id)
      }))
    )

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      modelVersion,
      nodes,
      edges,
      scenarios: exportedScenarios
    }
  }

  async importVersion(data: ModelsVersionsImport, params?: ModelsVersionsParams) {
    const payload = this.validateImportPayload(data.payload)
    const targetModelVersionId = data.id
    const nodeIdMap = new Map<string, string>()

    // Validate every relation up front, while the target version's existing data
    // is still intact, so a malformed payload is rejected before anything is wiped.
    const payloadNodeIds = new Set(payload.nodes.map((node) => node.id))
    for (const edge of payload.edges) {
      if (!payloadNodeIds.has(edge.sourceId) || !payloadNodeIds.has(edge.targetId)) {
        throw new BadRequest('The imported model version contains an edge that references a missing node.')
      }
    }
    for (const exportedScenario of payload.scenarios) {
      for (const scenarioValue of exportedScenario.scenarioValues) {
        if (!payloadNodeIds.has(scenarioValue.nodesId)) {
          throw new BadRequest(
            'The imported model version contains a scenario value that references a missing node.'
          )
        }
      }
    }

    // Version import replaces the contents of the target version. The caller is
    // responsible for choosing whether that target is an existing draft or a
    // newly created subversion.
    await this.removeAllScenarios(targetModelVersionId)
    await this.removeAllNodes(targetModelVersionId)

    const versionPatchData: Record<string, unknown> = _.pick(payload.modelVersion, [
      'notes',
      'timeUnits',
      'timeStart',
      'timeLength',
      'timeStep',
      'algorithm',
      'globals'
    ])

    if (Object.keys(versionPatchData).length > 0) {
      await this.patch(targetModelVersionId, versionPatchData as any, {})
    }

    const nodeRelationMap = new Map<
      string,
      {
        parentId: string | null
        ghostParentId: string | null
      }
    >()

    for (const node of payload.nodes) {
      // Create nodes without parent references first. Parent/ghost relations are
      // restored once every imported node has a new database id.
      const createNodeData = _.pick(node, Object.keys(nodesDataSchema.properties))
      const newNode = await this.app.service('nodes').create(
        {
          ...createNodeData,
          modelsVersionsId: targetModelVersionId,
          parentId: null,
          ghostParentId: null
        },
        {}
      )

      nodeIdMap.set(node.id, newNode.id)
      nodeRelationMap.set(newNode.id, {
        parentId: node.parentId ?? null,
        ghostParentId: node.ghostParentId ?? null
      })
    }

    for (const [newNodeId, relations] of nodeRelationMap.entries()) {
      const nodePatchData: Record<string, string> = {}

      if (relations.parentId && nodeIdMap.has(relations.parentId)) {
        nodePatchData.parentId = nodeIdMap.get(relations.parentId)!
      }
      if (relations.ghostParentId && nodeIdMap.has(relations.ghostParentId)) {
        nodePatchData.ghostParentId = nodeIdMap.get(relations.ghostParentId)!
      }

      if (Object.keys(nodePatchData).length > 0) {
        await this.app.service('nodes').patch(newNodeId, nodePatchData, {})
      }
    }

    for (const edge of payload.edges) {
      const createEdgeData = _.pick(edge, Object.keys(edgesDataSchema.properties))
      const newSourceId = nodeIdMap.get(edge.sourceId)
      const newTargetId = nodeIdMap.get(edge.targetId)

      if (!newSourceId || !newTargetId) {
        throw new BadRequest('The imported model version contains an edge that references a missing node.')
      }

      await this.app.service('edges').create(
        {
          ...createEdgeData,
          modelsVersionsId: targetModelVersionId,
          sourceId: newSourceId,
          targetId: newTargetId
        },
        {}
      )
    }

    for (const exportedScenario of payload.scenarios) {
      const createScenarioData = _.pick(
        exportedScenario.scenario,
        Object.keys(scenariosDataSchema.properties)
      )
      const newScenario = await this.app.service('scenarios').create(
        {
          ...createScenarioData,
          modelsVersionsId: targetModelVersionId
        },
        {}
      )

      for (const scenarioValue of exportedScenario.scenarioValues) {
        const createScenarioValueData = _.pick(
          scenarioValue,
          Object.keys(scenarioValuesDataSchema.properties)
        )
        const newNodeId = nodeIdMap.get(scenarioValue.nodesId)

        if (!newNodeId) {
          throw new BadRequest(
            'The imported model version contains a scenario value that references a missing node.'
          )
        }

        await this.app.service('scenarios-values').create(
          {
            ...createScenarioValueData,
            scenariosId: newScenario.id,
            nodesId: newNodeId
          },
          {}
        )
      }
    }

    if (payload.modelVersion.customUnits?.data) {
      // Custom unit references point at node ids, so rebuild them after node ids
      // have been remapped for the imported version.
      const remappedCustomUnits = Object.fromEntries(
        Object.entries(payload.modelVersion.customUnits.data).map(([unitName, oldNodeIds]) => [
          unitName,
          oldNodeIds
            .map((oldNodeId) => nodeIdMap.get(String(oldNodeId)))
            .filter((nodeId): nodeId is string => !!nodeId)
        ])
      )

      await this.patch(
        targetModelVersionId,
        {
          customUnits: {
            data: remappedCustomUnits
          }
        } as any,
        {}
      )
    } else {
      await this.patch(
        targetModelVersionId,
        {
          customUnits: null
        } as any,
        {}
      )
    }

    return this._get(targetModelVersionId)
  }

  private async removeAllScenarios(modelsVersionsId: string) {
    const scenarios = await findAllScenarios(this.app, modelsVersionsId)
    for (const scenario of scenarios) {
      await this.app.service('scenarios').remove(scenario.id, {})
    }
  }

  private async removeAllNodes(modelsVersionsId: string) {
    const nodes = await findAllNodes(this.app, modelsVersionsId)
    for (const node of nodes) {
      await this.app.service('nodes').remove(node.id, {})
    }
  }

  private validateImportPayload(payload: unknown): ExportedModelVersionPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequest('The imported file does not contain a valid model version export.')
    }

    const candidate = payload as Partial<ExportedModelVersionPayload>
    if (
      candidate.schemaVersion !== 1 ||
      !candidate.modelVersion ||
      !Array.isArray(candidate.nodes) ||
      !Array.isArray(candidate.edges) ||
      !Array.isArray(candidate.scenarios)
    ) {
      throw new BadRequest('The imported file is missing required model version export data.')
    }

    return candidate as ExportedModelVersionPayload
  }
}

export const getOptions = (app: Application): ModelsVersionsServiceOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'models_versions',
    app
  }
}
