// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import {
  modelsSchema,
  type Models,
  type ModelsCloneVersion,
  type ModelsData,
  type ModelsExport,
  type ModelsImport,
  type ModelsNewDraft,
  type ModelsPatch,
  type ModelsPublish,
  type ModelsQuery,
  type ModelsSimulate
} from './models.schema.js'
import { SimulationAdapter } from '../../shared/simulation-adapter/simulation-adapter.js'
import { logger } from '../../logger.js'
import _ from 'lodash'
import { ModelsVersions, modelsVersionsDataSchema } from '../models-versions/models-versions.schema.js'
import { Nodes, nodesDataSchema } from '../nodes/nodes.schema.js'
import { Edges, edgesDataSchema } from '../edges/edges.schema.js'
import { isServerCall } from '../../utils/is-server-call.js'
import { Scenarios, scenariosDataSchema } from '../scenarios/scenarios.schema.js'
import {
  ScenarioValues,
  scenarioValuesDataSchema
} from '../scenarios-values/scenarios-values.schema.js'
import { Roles } from '../../client.js'
import { QueryBuilder } from 'knex'
import { BadRequest, Forbidden } from '@feathersjs/errors'

export type { Models, ModelsData, ModelsPatch, ModelsQuery }

export interface ModelsParams extends KnexAdapterParams<ModelsQuery> {
  serializeForUMP?: boolean
}

export interface ModelsServiceOptions extends KnexAdapterOptions {
  app: Application
}

type ExportedScenario = {
  scenario: Scenarios
  scenarioValues: ScenarioValues[]
}

type ExportedModelVersion = {
  modelVersion: ModelsVersions
  nodes: Nodes[]
  edges: Edges[]
  scenarios: ExportedScenario[]
}

type ExportedModelPayload = {
  schemaVersion: 1
  exportedAt: string
  model: Models
  modelVersions: ExportedModelVersion[]
}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ModelsService<ServiceParams extends Params = ModelsParams> extends KnexService<
  Models,
  ModelsData,
  ModelsParams,
  ModelsPatch
> {
  declare options: ModelsServiceOptions

  createQuery(params: KnexAdapterParams<ModelsQuery>) {
    const query = super.createQuery(params as any)
    // ignore when isTouch is true, because then we only patch the updatedAt field, no need to join
    if (params.isTouch || (isServerCall(params) && !params?.user?.id)) {
      return query
    }

    if (!params?.user?.id) {
      throw new Error(
        'ModelsService:createQuery: params.user.id is required but not set. Probably missing authentication.'
      )
    }
    const raw = query.client.raw
    // join on models_users to get the role of the user
    query.leftJoin('models_users as models_users', function () {
      this.on('models.id', '=', 'models_users.modelId').andOn(
        'models_users.userId',
        '=',
        raw('?', [params?.user?.id])
      )
    })

    query.select('models_users.role as role')
    return query
  }

  get app(): Application {
    return this.options.app
  }

  async simulate(data: ModelsSimulate, params?: ModelsParams) {
    const nodeIdToParamValueMap = data.nodeIdToParameterValueMap
      ? new Map(Object.entries(data.nodeIdToParameterValueMap).map(([key, value]) => [key, value]))
      : new Map<string, number>()

    const simulationAdapter = new SimulationAdapter(this.app, data.id, nodeIdToParamValueMap, logger)
    await simulationAdapter.simulate()
    return params?.serializeForUMP ? simulationAdapter.getResultsForUMP() : simulationAdapter.getResults()
  }

  async newDraft(data: ModelsNewDraft, params?: ServiceParams) {
    const modelId = data.id

    const currentModel = await this.app.service('models').get(modelId, {
      user: params?.user
    })

    const latestVersion = currentModel.latestDraftVersionId
      ? currentModel.latestDraftVersionId
      : currentModel.latestPublishedVersionId

    if (!latestVersion) {
      throw new Error('No draft version found')
    }

    const currentModelVersion = await this.app.service('models-versions').get(latestVersion, {
      user: params?.user
    })

    const newDraftModelVersion = await this.cloneModelVersion(
      currentModelVersion,
      currentModelVersion.id,
      currentModel.currentMajorVersion,
      currentModel.currentMinorVersion,
      currentModel.currentDraftVersion + 1,
      params
    )

    await this.app.service('models-versions').patch(
      currentModelVersion.id,
      {
        isLatest: false
      },
      {
        user: params?.user
      }
    )

    return newDraftModelVersion
  }

  async publishMinor(data: ModelsPublish, params?: ServiceParams) {
    const currentModel = await this.app.service('models').get(data.id, { user: params?.user })

    const newMinor = currentModel.currentMinorVersion + 1
    const newDraft = 0

    await this.app.service('models').patch(
      data.id,
      {
        currentMinorVersion: newMinor,
        currentDraftVersion: newDraft,
        latestPublishedVersionId: currentModel.latestDraftVersionId,
        latestDraftVersionId: null
      },
      { user: params?.user }
    )

    await this.app.service('models-versions').patch(
      currentModel.latestDraftVersionId!,
      {
        notes: data.notes,
        minorVersion: newMinor,
        draftVersion: newDraft,
        publishedAt: new Date().toISOString(),
        publishedBy: params?.user?.id,
        publishedToUMPAt: data.publishedToUMP == 'Yes' ? new Date().toISOString() : null
      },
      { user: params?.user }
    )

    return {}
  }

  async publishMajor(data: ModelsPublish, params?: ServiceParams) {
    const currentModel = await this.app.service('models').get(data.id, { user: params?.user })

    const newMajor = currentModel.currentMajorVersion + 1
    const newMinor = 0
    const newDraft = 0

    await this.app.service('models').patch(
      data.id,
      {
        currentMajorVersion: newMajor,
        currentMinorVersion: newMinor,
        currentDraftVersion: newDraft,
        latestPublishedVersionId: currentModel.latestDraftVersionId
        // TODO: decide if latestDraftVersionId becomes null
      },
      {
        user: params?.user
      }
    )

    await this.app.service('models-versions').patch(
      currentModel.latestDraftVersionId!,
      {
        notes: data.notes,
        majorVersion: newMajor,
        minorVersion: newMinor,
        draftVersion: newDraft,
        publishedAt: new Date().toISOString(),
        publishedBy: params?.user?.id,
        publishedToUMPAt: data.publishedToUMP == 'Yes' ? new Date().toISOString() : null
      },
      {
        user: params?.user
      }
    )

    return {}
  }

  async cloneVersion(data: ModelsCloneVersion, params?: ServiceParams) {
    const modelVersionId = data.id

    const currentModelVersion = await this.app.service('models-versions').get(modelVersionId, {
      user: params?.user
    })

    const modelId = currentModelVersion.modelId

    const currentModel = await this.app.service('models').get(modelId, {
      user: params?.user
    })

    const newModel = await this.app.service('models').create(
      {
        internalName: data.internalName,
        // TODO: description is missing (ui -> backend)
        globalUuid: currentModel.globalUuid,
        forkedFromVersionId: modelVersionId,
        createdBy: params?.user?.id
      },
      { user: params?.user }
    )

    // create a new models-users with created = current user
    await this.app.service('models-users').create(
      {
        modelId: newModel.id,
        userId: params?.user?.id as string,
        role: Roles.owner
      },
      { user: params?.user }
    )

    currentModelVersion.modelId = newModel.id
    const newModelVersion = await this.cloneModelVersion(currentModelVersion, null, 0, 0, 1, params)

    return newModelVersion
  }

  async exportModel(data: ModelsExport, params?: ServiceParams): Promise<ExportedModelPayload> {
    const model = await this.getAuthorizedModel(data.id, params)

    // Export the model as a self-contained JSON document containing every
    // version and all graph/scenario records needed to recreate it elsewhere.
    const modelVersions = await this.findAllModelVersions(model.id)
    const exportedModelVersions = await Promise.all(
      modelVersions.map(async (modelVersion) => {
        const nodes = await this.findAllNodes(modelVersion.id)
        const edges = await this.findAllEdges(modelVersion.id)
        const scenarios = await this.findAllScenarios(modelVersion.id)

        const exportedScenarios = await Promise.all(
          scenarios.map(async (scenario) => ({
            scenario,
            scenarioValues: await this.findAllScenarioValues(scenario.id)
          }))
        )

        return {
          modelVersion,
          nodes,
          edges,
          scenarios: exportedScenarios
        }
      })
    )

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      model,
      modelVersions: exportedModelVersions
    }
  }

  async importModel(data: ModelsImport, params?: ServiceParams) {
    if (!params?.user?.id) {
      throw new Forbidden('Importing a model requires an authenticated user.')
    }

    const payload = this.validateImportPayload(data.payload)
    const sourceModel = payload.model

    // Build a brand-new parent model first. We then recreate every exported
    // version underneath it and remap all relations to the newly generated ids.
    const newModel = await this.app.service('models').create(
      {
        internalName: data.internalName ?? sourceModel.internalName,
        description: sourceModel.description,
        globalUuid: sourceModel.globalUuid,
        createdBy: params.user.id
      },
      { user: params.user }
    )

    // This create call is internal, so the usual external after-create hooks do
    // not assign owner permissions. Add the importing user explicitly so the new
    // model and its versions are immediately accessible.
    await this.app.service('models-users').create(
      {
        modelId: newModel.id,
        userId: params.user.id,
        role: Roles.owner
      },
      {}
    )

    const modelVersionIdMap = new Map<string, string>()

    for (const exportedVersion of payload.modelVersions) {
      // First pass: create empty versions and remember how old ids map to the
      // new ids. Parent version links are patched in a second pass.
      const originalVersion = exportedVersion.modelVersion
      const createModelVersionData = _.pick(
        originalVersion,
        Object.keys(modelsVersionsDataSchema.properties)
      )

      const newModelVersion = await this.app.service('models-versions').create(
        {
          ...createModelVersionData,
          modelId: newModel.id,
          parentId: null,
          createdBy: params.user.id
        },
        { user: params.user }
      )

      modelVersionIdMap.set(originalVersion.id, newModelVersion.id)
    }

    for (const exportedVersion of payload.modelVersions) {
      // Second pass: recreate the graph for each version and remap every
      // relation that used old exported ids to the new database ids.
      // The node id map is scoped to this version so that identically-numbered
      // node ids from other exported versions can never be confused with it.
      const nodeIdMap = new Map<string, string>()
      const originalVersion = exportedVersion.modelVersion
      const newModelVersionId = modelVersionIdMap.get(originalVersion.id)!
      const versionPatchData: Record<string, unknown> = {}

      if (originalVersion.parentId && modelVersionIdMap.has(originalVersion.parentId)) {
        versionPatchData.parentId = modelVersionIdMap.get(originalVersion.parentId)
      }
      if (originalVersion.publishedAt) {
        versionPatchData.publishedAt = originalVersion.publishedAt
        versionPatchData.publishedBy = params.user.id
      }
      if (Object.keys(versionPatchData).length > 0) {
        await this.app.service('models-versions').patch(newModelVersionId, versionPatchData, {})
      }

      const nodeRelationMap = new Map<
        string,
        {
          parentId: string | null
          ghostParentId: string | null
        }
      >()

      for (const node of exportedVersion.nodes) {
        const createNodeData = _.pick(node, Object.keys(nodesDataSchema.properties))
        const newNode = await this.app.service('nodes').create(
          {
            ...createNodeData,
            modelsVersionsId: newModelVersionId,
            parentId: null,
            ghostParentId: null
          },
          { user: params.user }
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
          await this.app.service('nodes').patch(newNodeId, nodePatchData, {
            user: params.user
          })
        }
      }

      if (originalVersion.customUnits?.data) {
        // Custom units store referenced node ids, so they must be rebuilt after
        // the target nodes exist in the new version.
        const remappedCustomUnits = Object.fromEntries(
          Object.entries(originalVersion.customUnits.data).map(([unitName, oldNodeIds]) => [
            unitName,
            oldNodeIds
              .map((oldNodeId) => nodeIdMap.get(String(oldNodeId)))
              .filter((nodeId): nodeId is string => !!nodeId)
          ])
        )

        await this.app.service('models-versions').patch(
          newModelVersionId,
          {
            customUnits: {
              data: remappedCustomUnits
            }
          } as any,
          {}
        )
      }

      for (const edge of exportedVersion.edges) {
        const createEdgeData = _.pick(edge, Object.keys(edgesDataSchema.properties))
        const newSourceId = nodeIdMap.get(edge.sourceId)
        const newTargetId = nodeIdMap.get(edge.targetId)

        if (!newSourceId || !newTargetId) {
          throw new BadRequest('The imported model contains an edge that references a missing node.')
        }

        await this.app.service('edges').create(
          {
            ...createEdgeData,
            modelsVersionsId: newModelVersionId,
            sourceId: newSourceId,
            targetId: newTargetId
          },
          { user: params.user }
        )
      }

      for (const exportedScenario of exportedVersion.scenarios) {
        const createScenarioData = _.pick(
          exportedScenario.scenario,
          Object.keys(scenariosDataSchema.properties)
        )
        const newScenario = await this.app.service('scenarios').create(
          {
            ...createScenarioData,
            modelsVersionsId: newModelVersionId
          },
          { user: params.user }
        )

        for (const scenarioValue of exportedScenario.scenarioValues) {
          const createScenarioValueData = _.pick(
            scenarioValue,
            Object.keys(scenarioValuesDataSchema.properties)
          )
          const newNodeId = nodeIdMap.get(scenarioValue.nodesId)

          if (!newNodeId) {
            throw new BadRequest(
              'The imported model contains a scenario value that references a missing node.'
            )
          }

          await this.app.service('scenarios-values').create(
            {
              ...createScenarioValueData,
              scenariosId: newScenario.id,
              nodesId: newNodeId
            },
            { user: params.user }
          )

        }
      }
    }

    // Finalize the parent model so version selectors and list metadata point to
    // the recreated draft/published versions instead of the temporary default one.
    await this.app.service('models').patch(
      newModel.id,
      {
        publicName:
          sourceModel.publicName ??
          data.internalName ??
          sourceModel.internalName ??
          'Imported model',
        currentMajorVersion: sourceModel.currentMajorVersion,
        currentMinorVersion: sourceModel.currentMinorVersion,
        currentDraftVersion: sourceModel.currentDraftVersion,
        latestDraftVersionId: sourceModel.latestDraftVersionId
          ? modelVersionIdMap.get(sourceModel.latestDraftVersionId) ?? null
          : null,
        latestPublishedVersionId: sourceModel.latestPublishedVersionId
          ? modelVersionIdMap.get(sourceModel.latestPublishedVersionId) ?? null
          : null,
        globalUuid: sourceModel.globalUuid,
        forkedFromVersionId: null
      },
      { user: params.user }
    )

    const importedModel = await this.app.service('models').get(newModel.id, {
      user: params.user
    })
    const targetModelVersionId =
      importedModel.latestDraftVersionId ??
      importedModel.latestPublishedVersionId ??
      modelVersionIdMap.get(payload.modelVersions[0].modelVersion.id)!

    const importedModelVersion = await this.app.service('models-versions').get(targetModelVersionId, {
      user: params.user
    })

    return {
      model: importedModel,
      modelVersion: importedModelVersion
    }
  }

  private async cloneModelVersion(
    currentModelVersion: ModelsVersions,
    parentId: string | null,
    major: number,
    minor: number,
    draft: number,
    params: ServiceParams | undefined
  ) {
    const createObjectData = _.pick(currentModelVersion, Object.keys(modelsVersionsDataSchema.properties))

    // TODO: ensure createdBy is set on a hook using params
    const newDraftModelVersion = await this.app.service('models-versions').create(
      {
        ...createObjectData,
        parentId: parentId,
        draftVersion: draft,
        majorVersion: major,
        minorVersion: minor,
        createdBy: params?.user?.id,
        isLatest: true,
        publishedToUMPAt: null
      },
      {
        user: params?.user
      }
    )

    await this.app.service('models').patch(
      currentModelVersion.modelId,
      {
        latestDraftVersionId: newDraftModelVersion.id,
        currentDraftVersion: draft,
        currentMinorVersion: minor,
        currentMajorVersion: major
      },
      {
        user: params?.user
      }
    )

    const nodes = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: currentModelVersion.id
      },
      user: params?.user
    })

    const nodeMigrationMap = new Map<string, string>()
    const newNodeIdToOldRelationMap = new Map<
      string,
      { parentId?: string | null; ghostParentId?: string | null }
    >()
    for (const node of nodes.data) {
      const createNodeData = _.pick(node, Object.keys(nodesDataSchema.properties))

      const newNode = await this.app.service('nodes').create(
        {
          ...createNodeData,
          modelsVersionsId: newDraftModelVersion.id,
          parentId: null,
          ghostParentId: null
        },
        {
          user: params?.user
        }
      )
      nodeMigrationMap.set(node.id, newNode.id)
      newNodeIdToOldRelationMap.set(newNode.id, {
        parentId: node.parentId,
        ghostParentId: node.ghostParentId
      })
    }

    const newNodes = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: newDraftModelVersion.id
      },
      user: params?.user
    })

    for (const newNode of newNodes.data) {
      const nodeRelations = newNodeIdToOldRelationMap.get(newNode.id)
      let newParentId = null
      let newGhostParentId = null
      if (nodeRelations?.parentId && nodeMigrationMap.has(nodeRelations.parentId)) {
        newParentId = nodeMigrationMap.get(nodeRelations.parentId)
      }
      if (nodeRelations?.ghostParentId && nodeMigrationMap.has(nodeRelations.ghostParentId)) {
        newGhostParentId = nodeMigrationMap.get(nodeRelations.ghostParentId)
      }
      if (newParentId || newGhostParentId) {
        await this.app.service('nodes').patch(
          newNode.id,
          {
            ...(newParentId ? { parentId: newParentId } : {}),
            ...(newGhostParentId ? { ghostParentId: newGhostParentId } : {})
          },
          {
            user: params?.user
          }
        )
      }
    }

    const edges = await this.app.service('edges').find({
      query: {
        modelsVersionsId: currentModelVersion.id
      },
      user: params?.user
    })

    for (const edge of edges.data) {
      const createEdgeData = _.pick(edge, Object.keys(edgesDataSchema.properties))

      if (nodeMigrationMap.has(edge.sourceId)) {
        createEdgeData.sourceId = nodeMigrationMap.get(edge.sourceId)!
      } else {
        throw new Error('SourceId node not found')
      }

      if (nodeMigrationMap.has(edge.targetId)) {
        createEdgeData.targetId = nodeMigrationMap.get(edge.targetId)!
      } else {
        throw new Error('TargetId node not found')
      }

      await this.app.service('edges').create(
        {
          ...createEdgeData,
          modelsVersionsId: newDraftModelVersion.id
        },
        { user: params?.user }
      )
    }

    // clone scenarios with all scenarios-values
    // Use _find to bypass permission hooks and get only scenarios from the specific model version
    const originalScenario = await this.app.service('scenarios')._find({
      query: {
        modelsVersionsId: currentModelVersion.id
      }
    })

    for (const scenario of originalScenario.data) {
      const createScenarioData = _.pick(scenario, Object.keys(scenariosDataSchema.properties))

      const newScenario = await this.app.service('scenarios').create(
        {
          ...createScenarioData,
          modelsVersionsId: newDraftModelVersion.id
        },
        {
          user: params?.user
        }
      )

      // Use _find to bypass permission hooks and get only scenario values for the specific scenario
      const scenarioValues = await this.app.service('scenarios-values')._find({
        query: {
          scenariosId: scenario.id
        }
      })

      for (const scenarioValue of scenarioValues.data) {
        const createScenarioValueData = _.pick(
          scenarioValue,
          Object.keys(scenarioValuesDataSchema.properties)
        )

        await this.app.service('scenarios-values').create(
          {
            ...createScenarioValueData,
            scenariosId: newScenario.id,
            nodesId: nodeMigrationMap.get(scenarioValue.nodesId)!
          },
          {
            user: params?.user
          }
        )
      }
    }

    return newDraftModelVersion
  }

  private async getAuthorizedModel(modelId: string, params?: ServiceParams) {
    const model = await this.get(modelId, {
      user: params?.user,
      query: {
        role: {
          $gte: Roles.viewer
        }
      } as any
    })

    if (model.role == null || model.role < Roles.viewer) {
      throw new Forbidden('You do not have permission to export this model.')
    }

    return model
  }

  private async findAllModelVersions(modelId: string) {
    const result = await this.app.service('models-versions')._find({
      query: {
        modelId
      }
    })

    return result.data.sort((left, right) => {
      if (left.majorVersion !== right.majorVersion) {
        return left.majorVersion - right.majorVersion
      }
      if (left.minorVersion !== right.minorVersion) {
        return left.minorVersion - right.minorVersion
      }
      return left.draftVersion - right.draftVersion
    })
  }

  private async findAllNodes(modelsVersionsId: string) {
    const result = await this.app.service('nodes')._find({
      query: {
        modelsVersionsId
      }
    })

    return result.data
  }

  private async findAllEdges(modelsVersionsId: string) {
    const result = await this.app.service('edges')._find({
      query: {
        modelsVersionsId
      }
    })

    return result.data
  }

  private async findAllScenarios(modelsVersionsId: string) {
    const result = await this.app.service('scenarios')._find({
      query: {
        modelsVersionsId
      }
    })

    return result.data
  }

  private async findAllScenarioValues(scenariosId: string) {
    const result = await this.app.service('scenarios-values')._find({
      query: {
        scenariosId
      }
    })

    return result.data
  }

  private validateImportPayload(payload: unknown): ExportedModelPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequest('The imported file does not contain a valid model export.')
    }

    const candidate = payload as Partial<ExportedModelPayload>
    if (
      candidate.schemaVersion !== 1 ||
      !candidate.model ||
      !Array.isArray(candidate.modelVersions) ||
      candidate.modelVersions.length === 0
    ) {
      throw new BadRequest('The imported file is missing required model export data.')
    }

    for (const exportedVersion of candidate.modelVersions) {
      if (
        !exportedVersion ||
        typeof exportedVersion !== 'object' ||
        !exportedVersion.modelVersion ||
        !exportedVersion.modelVersion.id ||
        !Array.isArray(exportedVersion.nodes) ||
        !Array.isArray(exportedVersion.edges) ||
        !Array.isArray(exportedVersion.scenarios)
      ) {
        throw new BadRequest('The imported file contains a model version with missing or malformed data.')
      }

      for (const exportedScenario of exportedVersion.scenarios) {
        if (
          !exportedScenario ||
          typeof exportedScenario !== 'object' ||
          !exportedScenario.scenario ||
          !Array.isArray(exportedScenario.scenarioValues)
        ) {
          throw new BadRequest('The imported file contains a scenario with missing or malformed data.')
        }
      }
    }

    return candidate as ExportedModelPayload
  }
}

export const getOptions = (app: Application): ModelsServiceOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'models',
    app
  }
}
