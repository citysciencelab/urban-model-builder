import { Model } from 'simulation'
import { Application } from '../../../declarations.js'
import { Nodes, NodeType } from '../../nodes/nodes.shared.js'
import { Agent, Container, Flow, Population, Primitive, State, Stock, Transition } from 'simulation/blocks'
import { EdgeType } from '../../edges/edges.shared.js'

const createSimulationObj = {
  [NodeType.Stock]: (model: Model, node: Nodes) => {
    return model.Stock({
      name: node.name,
      initial: node.data.value
    })
  },
  [NodeType.Variable]: (model: Model, node: Nodes) => {
    return model.Variable({
      name: node.name,
      value: node.data.value
    })
  },
  [NodeType.Flow]: async (model: Model, node: Nodes) => {
    return model.Flow(null, null, {
      name: node.name,
      rate: node.data.rate
    })
  },
  [NodeType.Converter]: (model: Model, node: Nodes) => {
    return model.Converter({
      name: node.name
    })
  },
  [NodeType.State]: (model: Model, node: Nodes) => {
    return model.State({
      name: node.name,
      residency: node.data.residency,
      startActive: node.data.startActive
    })
  },
  [NodeType.Transition]: (model: Model, node: Nodes) => {
    return model.Transition(null, null, {
      name: node.name,
      value: node.data.value,
      recalculate: node.data.recalculate,
      repeat: node.data.repeat,
      trigger: node.data.trigger
    })
  },
  [NodeType.Action]: (model: Model, node: Nodes) => {
    return model.Action({
      name: node.name,
      value: node.data.value,
      recalculate: node.data.recalculate,
      repeat: node.data.repeat,
      trigger: node.data.trigger
    })
  },
  [NodeType.Population]: (model: Model, node: Nodes) => {
    return model.Population({
      name: node.name,
      geoHeight: node.data.geoHeight,
      geoPlacementFunction: node.data.geoPlacementFunction,
      geoPlacementType: node.data.geoPlacementType,
      geoUnits: node.data.geoUnits,
      geoWidth: node.data.geoWidth,
      geoWrapAround: node.data.geoWrapAround,
      networkFunction: node.data.networkFunction,
      networkType: node.data.networkType,
      populationSize: node.data.populationSize
    })
  },
  [NodeType.Agent]: (model: Model, node: Nodes) => {
    return model.Agent({
      name: node.name
    })
  },
  [NodeType.Folder]: (model: Model, node: Nodes) => {
    return model.Folder({
      name: node.name
    })
  }
}

export class SimulateAdapter {
  constructor(private app: Application) {}

  async simulate(data: { id: number }) {
    const modelInDB = await this.app.service('models').get(data.id)

    const model = new Model({
      timeUnits: modelInDB.timeUnits,
      timeStart: modelInDB.timeStart,
      timeStep: modelInDB.timeStep || 1,
      timeLength: modelInDB.timeLength,
      algorithm: modelInDB.algorithm
    })

    model.globals = modelInDB.globals || ''

    const nodes = await this.app.service('nodes').find({
      query: {
        modelId: data.id
      }
    })

    const nodeIdPrimitiveMap = new Map<number, Primitive>()

    for (const node of nodes.data) {
      const type = node.type
      const simulationPrimitive = await createSimulationObj[type](model, node)
      nodeIdPrimitiveMap.set(node.id, simulationPrimitive)
    }

    const nodesWithParent = await this.app.service('nodes').find({
      query: {
        modelId: data.id,
        parentId: {
          $ne: null
        }
      }
    })

    for (const node of nodesWithParent.data) {
      const parentPrimitive = nodeIdPrimitiveMap.get(node.parentId!) as Container
      const childPrimitive = nodeIdPrimitiveMap.get(node.id) as Primitive
      if (!parentPrimitive) {
        throw new Error('Parent primitive not found')
      }
      if (!childPrimitive) {
        throw new Error('Child primitive not found')
      }
      childPrimitive.parent = parentPrimitive
    }

    const allPopulations = await this.app.service('nodes').find({
      query: {
        modelId: data.id,
        type: NodeType.Population
      }
    })

    let lastPopulation: Population | undefined

    for (const population of allPopulations.data) {
      const populationPrimitive = nodeIdPrimitiveMap.get(population.id) as Population
      lastPopulation = populationPrimitive
      if (population.data?.agentBaseId) {
        const relatedAgent = nodeIdPrimitiveMap.get(population.data.agentBaseId) as Agent
        populationPrimitive.agentBase = relatedAgent
      }
    }

    const edges = await this.app.service('edges').find({
      query: {
        modelId: data.id
      }
    })

    for (const edge of edges.data) {
      if (edge.type === EdgeType.Link) {
        const sourcePrimitive = nodeIdPrimitiveMap.get(edge.sourceId)
        const targetPrimitive = nodeIdPrimitiveMap.get(edge.targetId)
        if (sourcePrimitive && targetPrimitive) {
          model.Link(sourcePrimitive, targetPrimitive)
        }
      } else if (edge.type === EdgeType.Flow) {
        if (edge.sourceHandle.startsWith('flow')) {
          const targetPrimitive = nodeIdPrimitiveMap.get(edge.targetId) as Stock
          const flow = nodeIdPrimitiveMap.get(edge.sourceId) as Flow

          flow.end = targetPrimitive
        } else if (edge.targetHandle.startsWith('flow')) {
          const sourcePrimitive = nodeIdPrimitiveMap.get(edge.sourceId) as Stock
          const flow = nodeIdPrimitiveMap.get(edge.targetId) as Flow

          flow.start = sourcePrimitive
        } else {
          throw new Error('Invalid flow edge. Must have a flow handle')
        }
      } else if (edge.type === EdgeType.Transition) {
        if (edge.sourceHandle.startsWith('transition')) {
          const sourcePrimitive = nodeIdPrimitiveMap.get(edge.sourceId) as State
          const transition = nodeIdPrimitiveMap.get(edge.targetId) as Transition

          transition.end = sourcePrimitive
        } else if (edge.targetHandle.startsWith('transition')) {
          const targetPrimitive = nodeIdPrimitiveMap.get(edge.targetId) as State
          const transition = nodeIdPrimitiveMap.get(edge.sourceId) as Transition

          transition.start = targetPrimitive
        } else {
          throw new Error('Invalid transition edge. Must have a transition handle')
        }
      }
    }

    const result = model.simulate()

    // const res = result.series(lastPopulation!)![0].current
    // console.log('--->', res)

    const primitiveIdMap: Record<string, number> = {}
    for (const [nodeId, primitive] of nodeIdPrimitiveMap.entries()) {
      primitiveIdMap[primitive.id] = nodeId
    }

    return { ...result, primitiveIdMap }
  }
}
