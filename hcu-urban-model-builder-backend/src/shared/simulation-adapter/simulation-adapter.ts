import { Model } from 'simulation'
import { Nodes, NodeType } from '../../services/nodes/nodes.shared.js'
import {
  Agent,
  Container,
  Converter,
  Flow,
  Population,
  Primitive,
  State,
  Stock,
  Transition,
  ValuedPrimitive
} from 'simulation/blocks'
import { Edges, EdgeType } from '../../services/edges/edges.shared.js'
import { primitiveFactory } from './primitive-factory.js'
import { Results } from 'simulation/Results'
import { Logger } from 'winston'
import { ClientApplication } from '../../client.js'
import { Application } from '../../declarations.js'
import { SimulationError } from './simulation-error.js'
import _ from 'lodash'

type PopulationNodeResult = {
  id: string
  location: [number, number]
  state: number[]
}[][]

const NODE_TYPE_TO_PARAMETER_NAME_MAP = {
  [NodeType.Stock]: 'initial',
  [NodeType.Variable]: 'value',
  [NodeType.Flow]: 'rate',
  [NodeType.State]: 'startActive',
  [NodeType.Transition]: 'value',
  [NodeType.Population]: 'populationSize'
}

export class SimulationAdapter<T extends ClientApplication | Application> {
  private app: ClientApplication
  private nodeIdPrimitiveMapWithGhosts = new Map<number, Primitive>()
  private nodeIdPrimitiveMapWithoutGhosts = new Map<number, Primitive>()
  private ghostParentToChildIdMap = new Map<number, number[]>()
  private primitiveIdNodeIdMap: Map<string, number> = new Map()
  private primitiveIdTypeMap = new Map<string, NodeType>()

  constructor(
    app: T,
    private modelVersionId: number,
    private nodeIdToParameterValueMap: Map<number, number>,
    private logger: Logger | typeof console = console
  ) {
    this.app = app as ClientApplication
  }

  public async simulate(serializeForUMP: boolean = false) {
    const model = await this.createSimulationModel()

    await this.createModelPrimitives(model)

    await this.addGhostNodesToPrimitiveMap()

    await this.assignPrimitiveParents()

    await this.assignConverterInput()

    await this.createModelRelationsByEdges(model)
    try {
      const simulationResult = model.simulate()

      return serializeForUMP
        ? this.serializeSimulationResultForUMP(simulationResult, model)
        : this.serializeSimulationResult(simulationResult)
    } catch (error: any) {
      throw new SimulationError(error.message, {
        nodeId: this.primitiveIdNodeIdMap.get(error.primitive.id) || null
      })
    }
  }

  private async createSimulationModel() {
    const modelInDB = await this.app.service('models-versions').get(this.modelVersionId)

    const model = new Model({
      timeUnits: modelInDB.timeUnits || undefined,
      timeStart: modelInDB.timeStart || undefined,
      timeStep: modelInDB.timeStep || 1,
      timeLength: modelInDB.timeLength || undefined,
      algorithm: modelInDB.algorithm || undefined
    })

    model.globals = modelInDB.globals || ''

    return model
  }

  private async createModelPrimitives(model: Model) {
    const nodes = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: this.modelVersionId,
        type: {
          $ne: NodeType.Ghost
        }
      }
    })

    for (const node of nodes.data) {
      const simulationPrimitive = primitiveFactory(model, node)

      this.setParameter(node, simulationPrimitive)

      this.nodeIdPrimitiveMapWithGhosts.set(node.id, simulationPrimitive)
      this.nodeIdPrimitiveMapWithoutGhosts.set(node.id, simulationPrimitive)
      this.primitiveIdNodeIdMap.set(simulationPrimitive.id, node.id)
      this.primitiveIdTypeMap.set(simulationPrimitive.id, node.type)
    }
  }

  private async addGhostNodesToPrimitiveMap() {
    const ghostNodes = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: this.modelVersionId,
        type: NodeType.Ghost
      }
    })

    for (const ghostNode of ghostNodes.data) {
      if (!ghostNode.ghostParentId) {
        throw new Error('Ghost node must have a ghost parent')
      }
      const ghostParent = this.nodeIdPrimitiveMapWithGhosts.get(ghostNode.ghostParentId!)
      if (!ghostParent) {
        throw new Error('Ghost parent not found')
      }
      this.nodeIdPrimitiveMapWithGhosts.set(ghostNode.id, ghostParent)
      if (this.ghostParentToChildIdMap.has(ghostNode.ghostParentId)) {
        this.ghostParentToChildIdMap.get(ghostNode.ghostParentId)!.push(ghostNode.id)
      } else {
        this.ghostParentToChildIdMap.set(ghostNode.ghostParentId, [ghostNode.id])
      }
    }
  }

  private async assignPrimitiveParents() {
    const nodesWithParent = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: this.modelVersionId,
        parentId: {
          $ne: null
        }
      }
    })

    for (const node of nodesWithParent.data) {
      const parentPrimitive = this.nodeIdPrimitiveMapWithGhosts.get(node.parentId!) as Container
      const childPrimitive = this.nodeIdPrimitiveMapWithGhosts.get(node.id) as Primitive
      if (!parentPrimitive) {
        throw new Error('Parent primitive not found')
      }
      if (!childPrimitive) {
        throw new Error('Child primitive not found')
      }
      childPrimitive.parent = parentPrimitive
    }
  }

  private async assignConverterInput() {
    const converterNodes = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: this.modelVersionId,
        type: NodeType.Converter
      }
    })

    for (const node of converterNodes.data) {
      const ghostChildren = this.ghostParentToChildIdMap.get(node.id) || []
      const converterInputEdges = await this.app.service('edges').find({
        query: {
          modelsVersionsId: this.modelVersionId,
          targetId: {
            $in: [node.id, ...(ghostChildren || [])]
          }
        }
      })

      if (converterInputEdges.total > 1) {
        throw new Error('Converter node must have only one input node')
      }
      if (converterInputEdges.total === 0) {
        console.debug('Converter node has no input node. Has input type time')
        continue
      }

      const converterInputEdge = converterInputEdges.data[0]
      const converter = this.nodeIdPrimitiveMapWithGhosts.get(node.id) as Converter
      const inputNode = this.nodeIdPrimitiveMapWithGhosts.get(converterInputEdge.sourceId) as ValuedPrimitive
      converter.input = inputNode
    }
  }

  private async createModelRelationsByEdges(model: Model) {
    const edges = await this.app.service('edges').find({
      query: {
        modelsVersionsId: this.modelVersionId
      }
    })

    for (const edge of edges.data) {
      if (edge.type === EdgeType.Link) {
        const sourcePrimitive = this.nodeIdPrimitiveMapWithGhosts.get(edge.sourceId)
        const targetPrimitive = this.nodeIdPrimitiveMapWithGhosts.get(edge.targetId)
        if (sourcePrimitive && targetPrimitive) {
          model.Link(sourcePrimitive, targetPrimitive)
        }
      } else if (edge.type === EdgeType.Flow) {
        this.setPrimitiveStartEndByEdge(edge, 'flow')
      } else if (edge.type === EdgeType.Transition) {
        this.setPrimitiveStartEndByEdge(edge, 'transition')
      } else if (edge.type === EdgeType.AgentPopulation) {
        const population = this.nodeIdPrimitiveMapWithGhosts.get(edge.targetId) as Population
        const agent = this.nodeIdPrimitiveMapWithGhosts.get(edge.sourceId) as Agent
        population.agentBase = agent
      }
    }
  }

  private serializeSimulationResult(simulationResult: Results) {
    const resultData = {
      nodes: {} as Record<number, { series: number[] | PopulationNodeResult }>,
      times: simulationResult.times()
    }
    for (const [nodeId, primitive] of this.nodeIdPrimitiveMapWithoutGhosts) {
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

  private async serializeSimulationResultForUMP(simulationResult: Results, model: Model) {
    const resultData: Record<string, any> = {
      periods: simulationResult._data.periods,
      timeUnits: simulationResult.timeUnits,
      timeStep: model.timeStep,
      timeStart: model.timeStart,
      timeLength: model.timeLength
    }
    const outPutParameters = await this.app.service('nodes').find({
      query: {
        modelsVersionsId: this.modelVersionId,
        isOutputParameter: true
      }
    })
    for (const [nodeId, primitive] of this.nodeIdPrimitiveMapWithoutGhosts) {
      if (primitive.id in (simulationResult._data.children || {})) {
        const primitiveResult = simulationResult.series(primitive)
        if (outPutParameters.data.some((node: Nodes) => node.id === nodeId)) {
          resultData[_.snakeCase(primitive.name)] = primitiveResult
        }
      }
    }
    return resultData
  }

  private setPrimitiveStartEndByEdge<T extends 'flow' | 'transition'>(edge: Edges, handlePrefix: T) {
    if (edge.sourceHandle.startsWith(handlePrefix)) {
      const flowOrTransition = this.nodeIdPrimitiveMapWithGhosts.get(edge.sourceId) as T extends 'flow'
        ? Flow
        : Transition

      flowOrTransition.end = this.nodeIdPrimitiveMapWithGhosts.get(edge.targetId) as T extends 'flow'
        ? Stock
        : State
    } else if (edge.targetHandle.startsWith(handlePrefix)) {
      const flowOrTransition = this.nodeIdPrimitiveMapWithGhosts.get(edge.targetId) as T extends 'flow'
        ? Flow
        : Transition

      flowOrTransition.start = this.nodeIdPrimitiveMapWithGhosts.get(edge.sourceId) as T extends 'flow'
        ? Stock
        : State
    } else {
      throw new Error(`Invalid ${handlePrefix} edge. Must have a ${handlePrefix} handle. Edge id: ${edge.id}`)
    }
  }

  private setParameter(node: Nodes, simulationPrimitive: Primitive) {
    if (this.nodeIdToParameterValueMap.has(node.id)) {
      const type = node.type
      if (!this.isParameterNodeType(type)) {
        throw new Error('Node type does not have a corresponding parameter name')
      }
      const parameterName = NODE_TYPE_TO_PARAMETER_NAME_MAP[type]
      ;(simulationPrimitive as any)[parameterName] = this.nodeIdToParameterValueMap.get(node.id)
    }
  }

  private isParameterNodeType(type: NodeType): type is keyof typeof NODE_TYPE_TO_PARAMETER_NAME_MAP {
    return type in NODE_TYPE_TO_PARAMETER_NAME_MAP
  }
}
