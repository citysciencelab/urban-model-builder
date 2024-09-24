// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'
import { Model } from 'simulation'
import { plot } from 'simulation-viz-console'
import type { Action, Primitive, State, Stock, Transition, Population } from 'simulation/blocks'

import type { Application } from '../../declarations.js'
import type {
  Models,
  ModelsData,
  ModelsNewDraft,
  ModelsPatch,
  ModelsQuery,
  ModelsSimulate
} from './models.schema.js'
import { Nodes, NodeType } from '../nodes/nodes.shared.js'
import { EdgeType } from '../edges/edges.shared.js'
import { SimulationAdapter } from '../../simulation-adapter/simulation-adapter.js'
import _ from 'lodash'
import { ModelsVersionsData, modelsVersionsDataSchema } from '../models-versions/models-versions.schema.js'
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

  get app(): Application {
    return this.options.app
  }

  async simulate(data: ModelsSimulate, params?: ServiceParams) {
    return new SimulationAdapter(this.app, data.id).simulate()
  }

  async newDraft(data: ModelsNewDraft, params?: ServiceParams) {
    // patch the models currentDraftVersion, increment it by 1
    const currentModel = await this.app.service('models').get(data.id)

    const newDraftVersionNumber = currentModel.currentDraftVersion + 1

    if (!currentModel.latestDraftVersionId) {
      throw new Error('No draft version found')
    }

    const currentModelVersion = await this.app
      .service('models-versions')
      .get(currentModel.latestDraftVersionId)

    const createObjectData = _.pick(currentModelVersion, Object.keys(modelsVersionsDataSchema.properties))

    // TODO: ensure createdBy is set on a hook using params
    const newDraftModelVersion = await this.app.service('models-versions').create({
      ...createObjectData,
      parentId: currentModelVersion.id,
      draftVersion: newDraftVersionNumber
    })

    await this.app.service('models').patch(data.id, {
      latestDraftVersionId: newDraftModelVersion.id,
      currentDraftVersion: newDraftVersionNumber
    })

    const nodes = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: currentModelVersion.id
      }
    })

    const nodeMigrationMap = new Map<number, number>()
    for (const node of nodes.data) {
      const createNodeData = _.pick(node, Object.keys(nodesDataSchema.properties))

      const newNode = await this.app.service('nodes').create({
        ...createNodeData,
        modelsVersionsId: newDraftModelVersion.id
      })
      nodeMigrationMap.set(node.id, newNode.id)
    }

    const edges = await this.app.service('edges').find({
      query: {
        modelsVersionsId: currentModelVersion.id
      }
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

      await this.app.service('edges').create({
        ...createEdgeData,
        modelsVersionsId: newDraftModelVersion.id
      })
    }

    return newDraftModelVersion
  }

  async newMinor() {}
  async newMajor() {}
}

export const getOptions = (app: Application): ModelsServiceOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'models',
    app
  }
}
