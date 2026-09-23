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
  type ModelsSimulate,
  type SimulationResultCreate,
  type SimulationResultsFind,
  type SimulationResultRename
} from './models.schema.js'
import { SimulationAdapter } from '../../shared/simulation-adapter/simulation-adapter.js'
import { logger } from '../../logger.js'
import _ from 'lodash'
import { ModelsVersions, modelsVersionsDataSchema } from '../models-versions/models-versions.schema.js'
import { Nodes, nodesDataSchema } from '../nodes/nodes.schema.js'
import { Edges, edgesDataSchema } from '../edges/edges.schema.js'
import { isServerCall } from '../../utils/is-server-call.js'
import { Scenarios, scenariosDataSchema } from '../scenarios/scenarios.schema.js'
import { ScenarioValues, scenarioValuesDataSchema } from '../scenarios-values/scenarios-values.schema.js'
import { Roles } from '../../client.js'
import { QueryBuilder, type Knex } from 'knex'
import { BadRequest, Forbidden } from '@feathersjs/errors'
import { randomUUID } from 'crypto'
import {
  findAllEdges,
  findAllNodes,
  findAllScenarios,
  findAllScenarioValues
} from '../../shared/graph-queries.js'

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

  // The models-versions permission filter only applies to external calls (see
  // its `iff(isProvider('external'), ...)` guard), so an internal `.get()` like
  // this one would otherwise return the record for any model version
  // regardless of the caller's access. Check the joined role explicitly instead.
  private async assertModelVersionAccess(
    modelsVersionsId: string,
    user: NonNullable<ServiceParams['user']>,
    minRole: Roles
  ) {
    const modelVersion = await this.app.service('models-versions').get(modelsVersionsId, { user })
    if (modelVersion.role == null || modelVersion.role < minRole) {
      throw new Forbidden('You do not have permission to access this model version.')
    }
    return modelVersion
  }

  async saveSimulationResult(data: SimulationResultCreate, params?: ServiceParams) {
    if (!params?.user?.id) throw new Forbidden('Saving simulation results requires authentication.')
    await this.assertModelVersionAccess(data.modelsVersionsId, params.user, Roles.viewer)
    const [saved] = await this.app
      .get('postgresqlClient')('simulation_results')
      .insert({
        modelsVersionsId: data.modelsVersionsId,
        createdBy: params.user.id,
        name: data.name ?? `Simulation ${new Date().toISOString()}`,
        scenario: data.scenario,
        result: data.result
      })
      .returning('*')
    return saved
  }

  async findSimulationResults(data: SimulationResultsFind, params?: ServiceParams) {
    if (!params?.user?.id) throw new Forbidden('Reading simulation results requires authentication.')
    await this.assertModelVersionAccess(data.modelsVersionsId, params.user, Roles.viewer)
    const database = this.app.get('postgresqlClient')
    const baseQuery = database('simulation_results').where({ modelsVersionsId: data.modelsVersionsId })
    const [{ count }] = await baseQuery.clone().count<{ count: string }[]>('* as count')
    const rows = await baseQuery
      .clone()
      .orderBy('createdAt', 'desc')
      .offset(data.$skip ?? 0)
      .limit(data.$limit ?? 10)
    return { total: Number(count), data: rows }
  }

  async renameSimulationResult(data: SimulationResultRename, params?: ServiceParams) {
    if (!params?.user?.id) throw new Forbidden('Renaming simulation results requires authentication.')
    const database = this.app.get('postgresqlClient')
    const existing = await database('simulation_results').where({ id: data.id }).first()
    if (!existing) throw new BadRequest('Simulation result not found.')
    await this.assertModelVersionAccess(existing.modelsVersionsId, params.user, Roles.viewer)
    const [updated] = await database('simulation_results')
      .where({ id: data.id })
      .update({ name: data.name, updatedAt: database.fn.now() })
      .returning('*')
    return updated
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
    // Permission (an explicit role on the model) is enforced by the
    // checkModelPermission hook on this method; this just fetches the record.
    const model = await this.app.service('models').get(data.id, { user: params?.user })

    // Export the model as a self-contained JSON document containing every
    // version and all graph/scenario records needed to recreate it elsewhere.
    const modelVersions = await this.findAllModelVersions(model.id)
    const exportedModelVersions = await Promise.all(
      modelVersions.map(async (modelVersion) => {
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
    const user = params.user
    const userId = user.id

    // Validated up front (including that at least one model version is present)
    // so a malformed payload never reaches the transaction below.
    const payload = this.validateImportPayload(data.payload)
    const sourceModel = payload.model
    const modelId = randomUUID()
    const versionIds = new Map(
      payload.modelVersions.map(({ modelVersion }) => [modelVersion.id, randomUUID()])
    )
    const nodeIds = new Map<string, string>()
    const nodeKey = (versionId: string, nodeId: string) => `${versionId}:${nodeId}`
    for (const version of payload.modelVersions) {
      for (const node of version.nodes) {
        nodeIds.set(nodeKey(version.modelVersion.id, node.id), randomUUID())
      }
    }

    const versions: Record<string, unknown>[] = []
    // parentId/ghostParentId are immediate (non-deferrable) self-referencing
    // foreign keys, so rows are inserted with them nulled out and patched in a
    // second pass below instead of relying on exported/query order having
    // parents appear before their children.
    const versionParents: { id: string; parentId: string | null }[] = []
    const nodes: Record<string, unknown>[] = []
    const nodeParents: { id: string; parentId: string | null; ghostParentId: string | null }[] = []
    const edges: Record<string, unknown>[] = []
    const scenarios: Record<string, unknown>[] = []
    const scenarioValues: Record<string, unknown>[] = []

    for (const exported of payload.modelVersions) {
      const original = exported.modelVersion
      const versionId = versionIds.get(original.id)!
      const customUnits = original.customUnits?.data
        ? {
            data: Object.fromEntries(
              Object.entries(original.customUnits.data).map(([name, ids]) => [
                name,
                (ids as string[])
                  .map((id) => nodeIds.get(nodeKey(original.id, id)))
                  .filter((id): id is string => !!id)
              ])
            )
          }
        : null

      versions.push({
        ..._.pick(original, Object.keys(modelsVersionsDataSchema.properties)),
        id: versionId,
        modelId,
        parentId: null,
        createdBy: userId,
        publishedBy: original.publishedAt ? userId : null,
        publishedAt: original.publishedAt,
        customUnits
      })
      versionParents.push({
        id: versionId,
        parentId: original.parentId ? (versionIds.get(original.parentId) ?? null) : null
      })

      for (const node of exported.nodes) {
        const nodeId = nodeIds.get(nodeKey(original.id, node.id))!
        nodes.push({
          ..._.pick(node, Object.keys(nodesDataSchema.properties)),
          id: nodeId,
          modelsVersionsId: versionId,
          parentId: null,
          ghostParentId: null
        })
        nodeParents.push({
          id: nodeId,
          parentId: node.parentId ? (nodeIds.get(nodeKey(original.id, node.parentId)) ?? null) : null,
          ghostParentId: node.ghostParentId
            ? (nodeIds.get(nodeKey(original.id, node.ghostParentId)) ?? null)
            : null
        })
      }

      for (const edge of exported.edges) {
        const sourceId = nodeIds.get(nodeKey(original.id, edge.sourceId))
        const targetId = nodeIds.get(nodeKey(original.id, edge.targetId))
        if (!sourceId || !targetId) {
          throw new BadRequest('The imported model contains an edge that references a missing node.')
        }
        edges.push({
          ..._.pick(edge, Object.keys(edgesDataSchema.properties)),
          id: randomUUID(),
          modelsVersionsId: versionId,
          sourceId,
          targetId
        })
      }

      for (const exportedScenario of exported.scenarios) {
        const scenarioId = randomUUID()
        scenarios.push({
          ..._.pick(exportedScenario.scenario, Object.keys(scenariosDataSchema.properties)),
          id: scenarioId,
          modelsVersionsId: versionId
        })
        for (const value of exportedScenario.scenarioValues) {
          const nodesId = nodeIds.get(nodeKey(original.id, value.nodesId))
          if (!nodesId) {
            throw new BadRequest(
              'The imported model contains a scenario value that references a missing node.'
            )
          }
          scenarioValues.push({
            ..._.pick(value, Object.keys(scenarioValuesDataSchema.properties)),
            id: randomUUID(),
            scenariosId: scenarioId,
            nodesId
          })
        }
      }
    }

    const latestDraftVersionId = sourceModel.latestDraftVersionId
      ? (versionIds.get(sourceModel.latestDraftVersionId) ?? null)
      : null
    const latestPublishedVersionId = sourceModel.latestPublishedVersionId
      ? (versionIds.get(sourceModel.latestPublishedVersionId) ?? null)
      : null
    const database = this.app.get('postgresqlClient')
    const insertChunks = async (trx: Knex.Transaction, table: string, rows: Record<string, unknown>[]) => {
      for (let offset = 0; offset < rows.length; offset += 500) {
        await trx(table).insert(rows.slice(offset, offset + 500))
      }
    }

    // Bulk-patches self-referencing FK columns after the owning rows exist,
    // using array unnesting so each chunk only takes a single UPDATE statement.
    const updateSelfReferences = async (
      trx: Knex.Transaction,
      table: string,
      columns: string[],
      rows: { id: string; refs: (string | null)[] }[]
    ) => {
      const pending = rows.filter((row) => row.refs.some((ref) => ref !== null))
      for (let offset = 0; offset < pending.length; offset += 1000) {
        const chunk = pending.slice(offset, offset + 1000)
        const setClause = columns.map((column, i) => `"${column}" = u.c${i}`).join(', ')
        const unnestColumns = columns.map((_column, i) => `c${i}`).join(', ')
        const unnestArgs = columns.map(() => '?::uuid[]').join(', ')
        await trx.raw(
          `UPDATE ?? AS t SET ${setClause} FROM (SELECT * FROM unnest(?::uuid[], ${unnestArgs}) AS u(id, ${unnestColumns})) AS u WHERE t.id = u.id`,
          [table, chunk.map((row) => row.id), ...columns.map((_column, i) => chunk.map((row) => row.refs[i]))]
        )
      }
    }

    await database.transaction(async (trx) => {
      await trx('models').insert({
        id: modelId,
        internalName: data.internalName ?? sourceModel.internalName,
        publicName:
          sourceModel.publicName ?? data.internalName ?? sourceModel.internalName ?? 'Imported model',
        description: sourceModel.description,
        latestDraftVersionId: null,
        latestPublishedVersionId: null,
        currentMajorVersion: sourceModel.currentMajorVersion,
        currentMinorVersion: sourceModel.currentMinorVersion,
        currentDraftVersion: sourceModel.currentDraftVersion,
        globalUuid: sourceModel.globalUuid,
        forkedFromVersionId: null,
        createdBy: userId
      })
      await trx('models_users').insert({ id: randomUUID(), modelId, userId, role: Roles.owner })
      await insertChunks(trx, 'models_versions', versions)
      await updateSelfReferences(
        trx,
        'models_versions',
        ['parentId'],
        versionParents.map((version) => ({ id: version.id, refs: [version.parentId] }))
      )
      await insertChunks(trx, 'nodes', nodes)
      await updateSelfReferences(
        trx,
        'nodes',
        ['parentId', 'ghostParentId'],
        nodeParents.map((node) => ({ id: node.id, refs: [node.parentId, node.ghostParentId] }))
      )
      await insertChunks(trx, 'edges', edges)
      await insertChunks(trx, 'scenarios', scenarios)
      await insertChunks(trx, 'scenarios_values', scenarioValues)
      await trx('models').where({ id: modelId }).update({ latestDraftVersionId, latestPublishedVersionId })
    })

    const model = await this.app.service('models').get(modelId, { user })
    const targetVersionId =
      model.latestDraftVersionId ?? model.latestPublishedVersionId ?? versionIds.values().next().value!
    const modelVersion = await this.app.service('models-versions').get(targetVersionId, { user })
    return { model, modelVersion }
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
