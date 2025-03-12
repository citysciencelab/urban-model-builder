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
import { nodesDataSchema } from '../nodes/nodes.schema.js'
import { edgesDataSchema } from '../edges/edges.schema.js'
import { isServerCall } from '../../utils/is-server-call.js'
import { scenariosDataSchema } from '../scenarios/scenarios.schema.js'
import { scenarioValuesDataSchema } from '../scenarios-values/scenarios-values.schema.js'
import { Roles } from '../../client.js'
import { QueryBuilder } from 'knex'

export type { Models, ModelsData, ModelsPatch, ModelsQuery }

export interface ModelsParams extends KnexAdapterParams<ModelsQuery> {
  serializeForUMP?: boolean
}

export interface ModelsServiceOptions extends KnexAdapterOptions {
  app: Application
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
    simulationAdapter.simulate()
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
    for (const node of nodes.data) {
      const createNodeData = _.pick(node, Object.keys(nodesDataSchema.properties))

      const newNode = await this.app.service('nodes').create(
        {
          ...createNodeData,
          modelsVersionsId: newDraftModelVersion.id
        },
        {
          user: params?.user
        }
      )
      nodeMigrationMap.set(node.id, newNode.id)
    }

    const newNodes = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: newDraftModelVersion.id
      },
      user: params?.user
    })

    for (const newNode of newNodes.data) {
      let newParentId = null
      let newGhostParentId = null
      if (newNode.parentId && nodeMigrationMap.has(newNode.parentId)) {
        newParentId = nodeMigrationMap.get(newNode.parentId)
      }
      if (newNode.ghostParentId && nodeMigrationMap.has(newNode.ghostParentId)) {
        newGhostParentId = nodeMigrationMap.get(newNode.ghostParentId)
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
    const originalScenario = await this.app.service('scenarios').find({
      query: {
        modelsVersionsId: currentModelVersion.id
      },
      user: params?.user
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

      const scenarioValues = await this.app.service('scenarios-values').find({
        query: {
          scenariosId: scenario.id
        },
        user: params?.user
      })

      for (const scenarioValue of scenarioValues.data) {
        const createScenarioValueData = _.pick(
          scenarioValue,
          Object.keys(scenarioValuesDataSchema.properties)
        )

        await this.app.service('scenarios-values').create(
          {
            ...createScenarioValueData,
            scenariosId: newScenario.id
          },
          {
            user: params?.user
          }
        )
      }
    }

    return newDraftModelVersion
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
