// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'
import { Model } from 'simulation'
import { plot } from 'simulation-viz-console'

import type { Application } from '../../declarations.js'
import type { Models, ModelsData, ModelsPatch, ModelsQuery, ModelsSimulate } from './models.schema.js'
import { NodeType } from '../nodes/nodes.shared.js'
import { EdgeType } from '../edges/edges.shared.js'

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
  protected app: Application

  constructor(public options: ModelsServiceOptions) {
    super(options)
    this.app = options.app
  }

  async simulate(data: ModelsSimulate, params?: ServiceParams): Promise<Models> {
    const model = new Model({
      timeUnits: 'Years',
      timeStart: 0,
      timeLength: 200
    })

    const nodes = await this.app.service('nodes').find({
      query: {
        modelId: data.id,
        type: {
          $in: [NodeType.Stock, NodeType.Variable]
        }
      }
    })
    type Cache = {
      type: NodeType
      obj: any
    }

    const cache = new Map<number, Cache>()
    for (const node of nodes.data) {
      if (node.type === NodeType.Stock) {
        const stock = model.Stock({
          name: node.name,
          initial: node.value
        })
        cache.set(node.id, {
          type: NodeType.Stock,
          obj: stock
        })
      } else if (node.type === NodeType.Variable) {
        const variable = model.Variable({
          name: node.name,
          value: node.value
        })
        cache.set(node.id, {
          type: NodeType.Variable,
          obj: variable
        })
      } else {
        throw new Error('Invalid node type. Must be Stock or Variable')
      }
    }

    const flows = await this.app.service('nodes').find({
      query: {
        modelId: data.id,
        type: NodeType.Flow
      }
    })

    for (const node of flows.data) {
      const {
        data: [targetEdge]
      } = await this.app.service('edges').find({
        query: {
          $select: ['targetId'],
          modelId: data.id,
          type: EdgeType.Flow,
          sourceId: node.id
        }
      })

      const target = cache.get(targetEdge?.targetId)?.obj || null

      const {
        data: [sourceEge]
      } = await this.app.service('edges').find({
        query: {
          $select: ['sourceId'],
          modelId: data.id,
          type: EdgeType.Flow,
          targetId: node.id
        }
      })

      const source = cache.get(sourceEge?.sourceId)?.obj || null

      const flow = model.Flow(source, target, {
        name: node.name,
        rate: node.rate
      })

      cache.set(node.id, {
        type: NodeType.Flow,
        obj: flow
      })
    }

    const edges = await this.app.service('edges').find({
      query: {
        modelId: data.id,
        type: EdgeType.Link
      }
    })

    for (const edge of edges.data) {
      const sourceId = edge.sourceId
      const targetId = edge.targetId

      const source = cache.get(sourceId)
      const target = cache.get(targetId)

      if (!source || !target) {
        throw new Error('Invalid edge')
      }
      model.Link(source.obj, target.obj)
    }

    const resultData = model.simulate()

    const stockObjs = Array.from(cache.values())
      .filter(({ type }) => type === NodeType.Stock || type === NodeType.Variable)
      .map(({ obj }) => obj)

    plot(resultData, stockObjs)

    return resultData
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
