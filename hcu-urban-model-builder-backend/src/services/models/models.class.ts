// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'
import { Model, SimulationPrimitive } from 'simulation'
import { plot } from 'simulation-viz-console'

import type { Application } from '../../declarations.js'
import type { Models, ModelsData, ModelsPatch, ModelsQuery, ModelsSimulate } from './models.schema.js'
import { Nodes, NodeType } from '../nodes/nodes.shared.js'
import { EdgeType } from '../edges/edges.shared.js'
import { time } from 'console'

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
    type NodeIdMap = {
      type: NodeType
      obj: SimulationPrimitive
    }

    const nodeIdMap = new Map<number, NodeIdMap>()
    const simulationObjIdMap = new Map<number, number>()

    const pushAddToMap = (node: Nodes, simulationObj: { id: number }) => {
      simulationObjIdMap.set(simulationObj.id, node.id)
      nodeIdMap.set(node.id, {
        type: node.type,
        obj: simulationObj
      })
    }

    const createSimulationObj = {
      [NodeType.Stock]: (node: Nodes) => {
        return model.Stock({
          name: node.name,
          initial: node.value
        })
      },
      [NodeType.Variable]: (node: Nodes) => {
        return model.Variable({
          name: node.name,
          value: node.value
        })
      },
      [NodeType.Flow]: async (node: Nodes) => {
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

        const target = nodeIdMap.get(targetEdge?.targetId)?.obj || null

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

        const source = nodeIdMap.get(sourceEge?.sourceId)?.obj || null

        return model.Flow(source, target, {
          name: node.name,
          rate: node.rate
        })
      }
    }

    for (const node of nodes.data) {
      if (node.type === NodeType.Stock || node.type === NodeType.Variable) {
        const simulationObj = await createSimulationObj[node.type](node)
        pushAddToMap(node, simulationObj)
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
      const simulationObj = await createSimulationObj[node.type](node)
      pushAddToMap(node, simulationObj)
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

      const source = nodeIdMap.get(sourceId)
      const target = nodeIdMap.get(targetId)

      if (!source || !target) {
        throw new Error('Invalid edge')
      }
      model.Link(source.obj, target.obj)
    }

    const resultData = model.simulate()

    const stockObjs = Array.from(nodeIdMap.values())
      .filter(({ type }) => type === NodeType.Stock || type === NodeType.Variable)
      .map(({ obj }) => obj)

    plot(resultData, stockObjs)

    return {
      timeUnits: resultData.timeUnits,
      _data: resultData._data,
      primitiveIdMap: Object.fromEntries(simulationObjIdMap)
    }
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
