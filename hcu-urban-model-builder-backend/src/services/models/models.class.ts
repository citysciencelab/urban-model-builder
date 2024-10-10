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

export type { Models, ModelsData, ModelsPatch, ModelsQuery }

export interface ModelsParams extends KnexAdapterParams<ModelsQuery> {}

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
    if (params.isTouch) {
      return query
    }

    if (!params?.user?.id) {
      throw new Error(
        'ModelsService:createQuery: params.user.id is required but not set. Probably missing authentication.'
      )
    }
    // join on models_users to get the role of the user
    query.leftJoin('models_users as models_users', function () {
      this.on('models.id', '=', 'models_users.modelId').andOn(
        'models_users.userId',
        '=',
        params?.user?.id as unknown as any
      )
    })

    query.select('models_users.role as role')
    return query
  }

  get app(): Application {
    return this.options.app
  }

  async simulate(data: ModelsSimulate, params?: ServiceParams) {
    return new SimulationAdapter(this.app, data.id, logger).simulate()
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
        publishedBy: params?.user?.id
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
        publishedBy: params?.user?.id
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

    currentModelVersion.modelId = newModel.id
    const newModelVersion = await this.cloneModelVersion(currentModelVersion, null, 0, 0, 1, params)

    return newModelVersion
  }

  private async cloneModelVersion(
    currentModelVersion: ModelsVersions,
    parentId: number | null,
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
        isLatest: true
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

    const nodeMigrationMap = new Map<number, number>()
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

    const edges = await this.app.service('edges').find({
      query: {
        modelsVersionsId: currentModelVersion.id
      },
      user: params?.user
    })

    for (const edge of edges.data) {
      const createEdgeData = _.pick(edge, Object.keys(edgesDataSchema.properties))

      if (nodeMigrationMap.has(edge.sourceId)) {
        createEdgeData.sourceId = nodeMigrationMap.get(edge.sourceId) as number
      } else {
        throw new Error('SourceId node not found')
      }

      if (nodeMigrationMap.has(edge.targetId)) {
        createEdgeData.targetId = nodeMigrationMap.get(edge.targetId) as number
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
