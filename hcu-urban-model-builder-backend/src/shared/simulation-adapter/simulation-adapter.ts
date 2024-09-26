import { Model } from 'simulation'
import { NodeType } from '../../services/nodes/nodes.shared.js'
import { Agent, Container, Flow, Population, Primitive, State, Stock, Transition } from 'simulation/blocks'
import { Edges, EdgeType } from '../../services/edges/edges.shared.js'
import { primitiveFactory } from './primitive-factory.js'
import { Results } from 'simulation/Results'
import { Logger } from 'winston'
import { ClientApplication } from '../../client.js'
import { Application } from '../../declarations.js'

type PopulationNodeResult = {
  id: string
  location: [number, number]
  state: number[]
}[][]

export class SimulationAdapter<T extends ClientApplication | Application> {
  private app: ClientApplication
  private nodeIdPrimitiveMap = new Map<number, Primitive>()
  private primitiveIdNodeIdMap: Map<string, number> = new Map()
  private primitiveIdTypeMap = new Map<string, NodeType>()

  constructor(
    app: T,
    private modelId: number,
    private logger: Logger | typeof console = console
  ) {
    this.app = app as ClientApplication
  }

  public async simulate() {
    const model = await this.createSimulationModel()

    await this.createModelPrimitives(model)

    await this.assignPrimitiveParents()

    await this.assignAgentToPopulation()

    await this.createModelRelationsByEdges(model)

    const simulationResult = model.simulate()

    return this.serializeSimulationResult(simulationResult)
  }

  private async createSimulationModel() {
    const modelInDB = await this.app.service('models').get(this.modelId)

    const model = new Model({
      timeUnits: modelInDB.timeUnits,
      timeStart: modelInDB.timeStart,
      timeStep: modelInDB.timeStep || 1,
      timeLength: modelInDB.timeLength,
      algorithm: modelInDB.algorithm
    })

    model.globals = modelInDB.globals || ''

    return model
  }

  private async createModelPrimitives(model: Model) {
    const nodes = await this.app.service('nodes').find({
      query: {
        modelId: this.modelId
      }
    })

    for (const node of nodes.data) {
      const simulationPrimitive = await primitiveFactory(model, node)
      this.nodeIdPrimitiveMap.set(node.id, simulationPrimitive)
      this.primitiveIdNodeIdMap.set(simulationPrimitive.id, node.id)
      this.primitiveIdTypeMap.set(simulationPrimitive.id, node.type)
    }
  }

  private async assignPrimitiveParents() {
    const nodesWithParent = await this.app.service('nodes').find({
      query: {
        modelId: this.modelId,
        parentId: {
          $ne: null
        }
      }
    })

    for (const node of nodesWithParent.data) {
      const parentPrimitive = this.nodeIdPrimitiveMap.get(node.parentId!) as Container
      const childPrimitive = this.nodeIdPrimitiveMap.get(node.id) as Primitive
      if (!parentPrimitive) {
        throw new Error('Parent primitive not found')
      }
      if (!childPrimitive) {
        throw new Error('Child primitive not found')
      }
      childPrimitive.parent = parentPrimitive
    }
  }

  private async assignAgentToPopulation() {
    const allPopulations = await this.app.service('nodes').find({
      query: {
        modelId: this.modelId,
        type: NodeType.Population
      }
    })

    for (const population of allPopulations.data) {
      const populationPrimitive = this.nodeIdPrimitiveMap.get(population.id) as Population

      if (population.data?.agentBaseId) {
        const relatedAgent = this.nodeIdPrimitiveMap.get(population.data.agentBaseId) as Agent
        populationPrimitive.agentBase = relatedAgent
      }
    }
  }

  private async createModelRelationsByEdges(model: Model) {
    const edges = await this.app.service('edges').find({
      query: {
        modelId: this.modelId
      }
    })

    for (const edge of edges.data) {
      if (edge.type === EdgeType.Link) {
        const sourcePrimitive = this.nodeIdPrimitiveMap.get(edge.sourceId)
        const targetPrimitive = this.nodeIdPrimitiveMap.get(edge.targetId)
        if (sourcePrimitive && targetPrimitive) {
          model.Link(sourcePrimitive, targetPrimitive)
        }
      } else if (edge.type === EdgeType.Flow) {
        this.setPrimitiveStartEndByEdge(edge, 'flow')
      } else if (edge.type === EdgeType.Transition) {
        this.setPrimitiveStartEndByEdge(edge, 'transition')
      }
    }
  }

  private serializeSimulationResult(simulationResult: Results) {
    const resultData = {
      nodes: {} as Record<number, { series: number[] | PopulationNodeResult }>,
      times: simulationResult.times()
    }
    for (const [nodeId, primitive] of this.nodeIdPrimitiveMap) {
      if (primitive.id in (simulationResult._data.children || {})) {
        const primitiveResult = simulationResult.series(primitive)

        let series: number[] | PopulationNodeResult = []
        if (NodeType.Population === this.primitiveIdTypeMap.get(primitive.id)) {
          series = primitiveResult.map((value: any) =>
            value.current.map(
              (item: {
                instanceId: string
                state: { id: string }[]
                location: { items: [number, number] }
              }) => ({
                id: item.instanceId,
                location: item.location.items,
                state: item.state?.map((s: { id: string }) => this.primitiveIdNodeIdMap.get(s.id)) || []
              })
            )
          )
        } else {
          series = primitiveResult
        }

        resultData.nodes[nodeId] = {
          series
        }
      } else {
        this.logger.debug('No result for primitive with id:', primitive.id)
      }
    }

    return resultData
  }

  private setPrimitiveStartEndByEdge<T extends 'flow' | 'transition'>(edge: Edges, handlePrefix: T) {
    if (edge.sourceHandle.startsWith(handlePrefix)) {
      const flowOrTransition = this.nodeIdPrimitiveMap.get(edge.sourceId) as T extends 'flow'
        ? Flow
        : Transition

      flowOrTransition.end = this.nodeIdPrimitiveMap.get(edge.targetId) as T extends 'flow' ? Stock : State
    } else if (edge.targetHandle.startsWith(handlePrefix)) {
      const flowOrTransition = this.nodeIdPrimitiveMap.get(edge.targetId) as T extends 'flow'
        ? Flow
        : Transition

      flowOrTransition.start = this.nodeIdPrimitiveMap.get(edge.sourceId) as T extends 'flow' ? Stock : State
    } else {
      throw new Error(`Invalid ${handlePrefix} edge. Must have a ${handlePrefix} handle. Edge id: ${edge.id}`)
    }
  }
}
