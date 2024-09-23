import { Model } from 'simulation'
import { Application } from '../declarations.js'
import { Nodes, NodeType } from '../services/nodes/nodes.shared.js'
import { Agent, Container, Flow, Population, Primitive, State, Stock, Transition } from 'simulation/blocks'
import { EdgeType } from '../services/edges/edges.shared.js'
import { primitiveFactory } from './primitive-factory.js'

type PopulationNodeResult = {
  location: [number, number]
  state: {
    id: string
  }[]
}[][]

export class SimulationAdapter {
  constructor(
    private app: Application,
    private modelId: number
  ) {}

  async simulate() {
    const modelInDB = await this.app.service('models').get(this.modelId)

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
        modelId: this.modelId
      }
    })

    const nodeIdPrimitiveMap = new Map<number, Primitive>()
    const primitiveIdTypeMap = new Map<string, NodeType>()

    for (const node of nodes.data) {
      const type = node.type
      const simulationPrimitive = await primitiveFactory(model, node)
      nodeIdPrimitiveMap.set(node.id, simulationPrimitive)
      primitiveIdTypeMap.set(simulationPrimitive.id, node.type)
    }

    const nodesWithParent = await this.app.service('nodes').find({
      query: {
        modelId: this.modelId,
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
        modelId: this.modelId,
        type: NodeType.Population
      }
    })

    for (const population of allPopulations.data) {
      const populationPrimitive = nodeIdPrimitiveMap.get(population.id) as Population

      if (population.data?.agentBaseId) {
        const relatedAgent = nodeIdPrimitiveMap.get(population.data.agentBaseId) as Agent
        populationPrimitive.agentBase = relatedAgent
      }
    }

    const edges = await this.app.service('edges').find({
      query: {
        modelId: this.modelId
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
          const sourcePrimitive = nodeIdPrimitiveMap.get(edge.targetId) as State
          const transition = nodeIdPrimitiveMap.get(edge.sourceId) as Transition

          transition.end = sourcePrimitive
        } else if (edge.targetHandle.startsWith('transition')) {
          const targetPrimitive = nodeIdPrimitiveMap.get(edge.sourceId) as State
          const transition = nodeIdPrimitiveMap.get(edge.targetId) as Transition

          transition.start = targetPrimitive
        } else {
          throw new Error('Invalid transition edge. Must have a transition handle')
        }
      }
    }

    const simulationResult = model.simulate()

    const primitiveIdMap: Record<string, number> = {}
    for (const [nodeId, primitive] of nodeIdPrimitiveMap.entries()) {
      primitiveIdMap[primitive.id] = nodeId
    }

    const resultData = {
      nodes: {} as Record<number, { series: number[] | PopulationNodeResult }>,
      times: simulationResult.times()
    }
    for (const [nodeId, primitive] of nodeIdPrimitiveMap) {
      if (primitive.id in simulationResult._data.children!) {
        const primitiveResult = simulationResult.series(primitive)

        let series: number[] | PopulationNodeResult = []
        if (NodeType.Population === primitiveIdTypeMap.get(primitive.id)) {
          series = primitiveResult.map((value: any) =>
            value.current.map((item: { state: { id: string }[]; location: { items: [number, number] } }) => ({
              location: item.location.items,
              state: item.state.map((s: { id: string }) => primitiveIdMap[s.id])
            }))
          )
        } else {
          series = primitiveResult
        }

        resultData.nodes[nodeId] = {
          series
        }
      } else {
        console.debug('No result for primitive with id:', primitive.id)
      }
    }

    return resultData
  }
}
