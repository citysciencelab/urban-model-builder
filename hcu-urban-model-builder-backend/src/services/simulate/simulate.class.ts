// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'
import { Model } from 'simulation'
import { plot } from "simulation-viz-console";

import type { Application } from '../../declarations.js'
import type { Simulate, SimulateData, SimulatePatch, SimulateQuery } from './simulate.schema.js'
import { NodeType } from '../nodes/nodes.shared.js';
import { EdgeType } from '../edges/edges.shared.js';

export type { Simulate, SimulateData, SimulatePatch, SimulateQuery }

export interface SimulateServiceOptions {
  app: Application
}

export interface SimulateParams extends Params<SimulateQuery> { }

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class SimulateService<ServiceParams extends SimulateParams = SimulateParams>
  implements ServiceInterface<Simulate, SimulateData, ServiceParams, SimulatePatch> {

  app: Application

  constructor(public options: SimulateServiceOptions) {
    this.app = options.app
  }

  async find(_params?: ServiceParams): Promise<Simulate[]> {
    return []
  }

  async get(id: Id, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      text: `A new message with ID: ${id}!`
    }
  }

  async create(data: SimulateData, params?: ServiceParams): Promise<Simulate>
  async create(data: SimulateData[], params?: ServiceParams): Promise<Simulate[]>
  async create(data: SimulateData | SimulateData[], params?: ServiceParams): Promise<Simulate | Simulate[]> {

    const model = new Model({
      timeUnits: "Years",
      timeStart: 0,
      timeLength: 200,
    })

    const nodes = await this.app.service('nodes').find({
      query: {
        type: {
          $in: [NodeType.Stock, NodeType.Variable]
        }
      }
    })
    type Cache = {
      type: NodeType,
      obj: any
    }

    const cache = new Map<number, Cache>()
    for (const node of nodes.data) {
      if (node.type === NodeType.Stock) {
        const stock = model.Stock({
          name: node.data.label,
          initial: node.value
        })
        cache.set(node.id, {
          type: NodeType.Stock,
          obj: stock
        })
      } else if (node.type === NodeType.Variable) {
        const variable = model.Variable({
          name: node.data.label,
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
        type: NodeType.Flow
      }
    })

    for (const node of flows.data) {


      const { data: [targetEdge] } = await this.app.service('edges').find({
        query: {
          $select: ['targetId'],
          type: EdgeType.Flow,
          sourceId: node.id
        }
      })

      const target = cache.get(targetEdge?.targetId)?.obj || null

      const { data: [sourceEge] } = await this.app.service('edges').find({
        query: {
          $select: ['sourceId'],
          type: EdgeType.Flow,
          targetId: node.id
        }
      })

      const source = cache.get(sourceEge?.sourceId)?.obj || null

      const flow = model.Flow(source, target, {
        name: node.data.label,
        rate: node.rate
      })

      cache.set(node.id, {
        type: NodeType.Flow,
        obj: flow
      })
    }

    const edges = await this.app.service('edges').find({
      query: {
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

    const stockObjs = Array.from(cache.values()).filter(({ type }) => type === NodeType.Stock || type === NodeType.Variable).map(({ obj }) => obj)

    plot(data, stockObjs)

    return resultData
  }

  // This method has to be added to the 'methods' option to make it available to clients
  async update(id: NullableId, data: SimulateData, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      ...data
    }
  }

  async patch(id: NullableId, data: SimulatePatch, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      text: `Fallback for ${id}`,
      ...data
    }
  }

  async remove(id: NullableId, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      text: 'removed'
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
