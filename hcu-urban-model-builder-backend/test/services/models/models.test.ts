// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../src/app.js'
import { loadInsightMaker } from 'simulation'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { EdgesData, EdgeType, NodeType } from '../../../src/client.js'
import { Model } from 'simulation'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe.only('models service', () => {
  it('registered the service', () => {
    const service = app.service('models')

    assert.ok(service, 'Registered the service')
  })

  describe('simulate', () => {
    beforeEach(async () => {
      await app.get('postgresqlClient').table('models').del()
    })

    after(async () => {
      await app.get('postgresqlClient').table('models').del()
    })

    it('should create a basic system dynamic model', async () => {
      const model = await app.service('models').create({
        name: 'test',
        timeUnits: 'Years',
        timeStart: 0,
        timeLength: 200
      })

      const baseNodeData = {
        modelId: model.id,
        height: null,
        width: null,
        parentId: null
      }

      const childrenPerWomanVar = await app.service('nodes').create({
        name: 'Children per Woman',
        type: NodeType.Variable,
        data: { value: '1.5' },
        position: { x: 100, y: 0 },
        ...baseNodeData
      })

      const totalPopulationVar = await app.service('nodes').create({
        name: 'Total Population',
        type: NodeType.Variable,
        data: {
          value: '[Population 19 plus]+[Population 0-18]'
        },
        position: { x: 100, y: 100 },
        ...baseNodeData
      })

      const population0_18Stock = await app.service('nodes').create({
        name: 'Population 0-18',
        type: NodeType.Stock,
        data: { value: '1000' },
        position: { x: 100, y: 200 },
        ...baseNodeData
      })

      const population19PlusStock = await app.service('nodes').create({
        name: 'Population 19 plus',
        type: NodeType.Stock,
        data: { value: '5000' },
        position: { x: 100, y: 300 },
        ...baseNodeData
      })

      const birthsFlow = await app.service('nodes').create({
        name: 'Births',
        type: NodeType.Flow,
        data: { rate: '[Population 19 plus]/2/20*[Children per Woman]' },
        position: { x: 100, y: 400 },
        ...baseNodeData
      })

      const agingFlow = await app.service('nodes').create({
        name: 'aging',
        type: NodeType.Flow,
        data: { rate: '[Population 0-18]/18' },
        position: { x: 100, y: 500 },
        ...baseNodeData
      })

      const deathsFlow = await app.service('nodes').create({
        name: 'Deaths',
        type: NodeType.Flow,
        data: { rate: '[Population 19 plus]*0.05' },
        position: { x: 100, y: 600 },
        ...baseNodeData
      })

      const baseEdgeData = {
        modelId: model.id,
        sourceHandle: '0',
        targetHandle: '0'
      }

      const modelEdges: (Omit<EdgesData, 'modelId' | 'sourceHandle' | 'targetHandle'> & {
        sourceHandle?: string
        targetHandle?: string
      })[] = [
        {
          sourceId: childrenPerWomanVar.id,
          targetId: birthsFlow.id,
          type: EdgeType.Link
        },
        {
          sourceId: population19PlusStock.id,
          targetId: birthsFlow.id,
          type: EdgeType.Link
        },
        {
          sourceId: population0_18Stock.id,
          targetId: totalPopulationVar.id,
          type: EdgeType.Link
        },
        {
          sourceId: population19PlusStock.id,
          targetId: totalPopulationVar.id,
          type: EdgeType.Link
        },
        {
          sourceId: birthsFlow.id,
          targetId: population0_18Stock.id,
          sourceHandle: 'flow-source',
          type: EdgeType.Flow
        },
        {
          sourceId: population0_18Stock.id,
          targetId: agingFlow.id,
          targetHandle: 'flow-target',
          type: EdgeType.Flow
        },
        {
          sourceId: agingFlow.id,
          targetId: population19PlusStock.id,
          sourceHandle: 'flow-source',
          type: EdgeType.Flow
        },
        {
          sourceId: population19PlusStock.id,
          targetId: deathsFlow.id,
          targetHandle: 'flow-target',
          type: EdgeType.Flow
        }
      ]

      const edges = await Promise.all(
        modelEdges.map(async (edge) => {
          return app.service('edges').create({
            ...baseEdgeData,
            ...edge
          })
        })
      )

      const nodes = await app.service('nodes').find()
      const nodeNameToIdMap = new Map<string, number>()
      for (const node of nodes.data) {
        nodeNameToIdMap.set(node.name, node.id)
      }

      const actual = await app.service('models').simulate({ id: model.id })

      assert.ok(actual.nodes)

      const file = await readFile(join(__dirname, 'sd-model.xml'), 'utf8')

      const imModel = loadInsightMaker(file)
      const res = imModel.simulate()
      const expectedData = res._data.data?.map((d: any) => {
        return Object.entries(d).reduce((acc, [key, value]) => {
          acc[res._nameIdMapping[key]] = value
          return acc
        }, {} as any)
      })

      assert.deepStrictEqual(actual.times, res._data.times)

      let i = 0
      const allNodeNames = ['Births', 'Deaths', 'Population 0-18', 'Population 19 plus', 'Total Population']
      const actualNodeData = actual.nodes
      for (const expectedDataItem of expectedData!) {
        for (const nodeName of allNodeNames) {
          const expectedValue = expectedDataItem[nodeName]
          const nodeId = nodeNameToIdMap.get(nodeName)
          assert.ok(nodeId)
          assert.ok(nodeId in actualNodeData, `Node ${nodeName} not found in actual data`)
          const actualValue = actualNodeData[nodeId].series[i]

          assert.ok(!isNaN(expectedValue))
          assert.ok(typeof actualValue === 'number')
          assert.ok(!isNaN(actualValue))

          const expectedValueAsInt = Math.round(expectedValue)
          const actualValueAsInt = Math.round(actualValue)
          assert.strictEqual(expectedValueAsInt, actualValueAsInt)

          const diff = Math.abs(expectedValue - actualValue)

          assert.ok(
            diff <= 10e-10,
            `Expected ${i} item ${nodeName} to be ${expectedValue} but got ${actualValue}. Diff: ${diff}`
          )
        }

        i++
      }
    })

    it('should create a agent based model', async () => {
      const model = await app.service('models').create({
        name: 'test',
        timeUnits: 'Years',
        timeStart: 0,
        timeLength: 50,
        algorithm: 'Euler',
        globals: 'SetRandSeed(123)'
      })

      const baseNodeData = {
        modelId: model.id
      }

      const personAgent = await app.service('nodes').create({
        name: 'Person',
        type: NodeType.Agent,
        position: { x: 100, y: 0 },
        data: {},
        ...baseNodeData
      })

      const populationPopulation = await app.service('nodes').create({
        name: 'Population',
        type: NodeType.Population,
        position: { x: 100, y: 100 },
        data: {
          agentBaseId: personAgent.id,
          populationSize: 100,
          geoPlacementType: 'Random',
          geoWidth: '200',
          geoHeight: '100',
          geoUnits: 'Unitless',
          networkType: 'None',
          geoPlacementFunction: '<<index([Self])*10,index([Self])*20>>',
          networkFunction: 'randBoolean(0.06)'
        },
        ...baseNodeData
      })

      const percentInfectedVariable = await app.service('nodes').create({
        name: 'Percent Infected',
        type: NodeType.Variable,
        position: { x: 100, y: 200 },
        data: {
          value: '[Population].FindState( [Infected]).Count()/[Population].FindAll().Count()*100'
        },
        ...baseNodeData
      })

      const susceptibleState = await app.service('nodes').create({
        name: 'Susceptible',
        type: NodeType.State,
        position: { x: 100, y: 100 },
        data: {
          startActive: 'true',
          residency: '0'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const infectedState = await app.service('nodes').create({
        name: 'Infected',
        type: NodeType.State,
        position: { x: 100, y: 200 },
        data: {
          startActive: 'not [Susceptible]',
          residency: '0'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const recoveredState = await app.service('nodes').create({
        name: 'Recovered',
        type: NodeType.State,
        position: { x: 100, y: 300 },
        data: {
          startActive: 'false',
          residency: '0'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const transmitTransition = await app.service('nodes').create({
        name: 'Transmit',
        type: NodeType.Transition,
        position: { x: 100, y: 400 },
        data: {
          trigger: 'Probability',
          value:
            'infectors <- [Population].FindState([Infected]).FindNearby(Self, 25)\n\nprobInfect <-  min(1, infectors.Map(1/(distance(x, Self))^.75))\n\n1 - Product(Join(1, 1 - probInfect ))',
          recalculate: true
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const exogenousTransition = await app.service('nodes').create({
        name: 'Exogenous',
        type: NodeType.Transition,
        position: { x: 100, y: 500 },
        data: {
          trigger: 'Condition',
          value: 'Self.Index()=1 and Years=5'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const recoveryTransition = await app.service('nodes').create({
        name: 'Recovery',
        type: NodeType.Transition,
        position: { x: 100, y: 600 },
        data: {
          trigger: 'Probability',
          value: '0.09',
          recalculate: true
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const immunityLossTransition = await app.service('nodes').create({
        name: 'Immunity Loss',
        type: NodeType.Transition,
        position: { x: 100, y: 700 },
        data: {
          trigger: 'Probability',
          value: '.02'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const flightAction = await app.service('nodes').create({
        name: 'Flight',
        type: NodeType.Action,
        position: { x: 100, y: 800 },
        data: {
          action: 'Self.moveTowards([Population].FindState([Infected]).FindNearest(Self), -0.5)',
          trigger: 'Condition',
          value: '[Susceptible] and [Population].FindState([Infected]).Count() > 0',
          recalculate: true,
          repeat: true
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const baseEdgeData = {
        modelId: model.id,
        sourceHandle: '0',
        targetHandle: '0'
      }

      const modelEdges: (Omit<EdgesData, 'modelId' | 'sourceHandle' | 'targetHandle'> & {
        sourceHandle?: string
        targetHandle?: string
      })[] = [
        // Links
        {
          type: EdgeType.Link,
          sourceId: populationPopulation.id,
          targetId: percentInfectedVariable.id
        },
        {
          type: EdgeType.Link,
          sourceId: populationPopulation.id,
          targetId: flightAction.id
        },
        {
          type: EdgeType.Link,
          sourceId: populationPopulation.id,
          targetId: transmitTransition.id
        },
        {
          type: EdgeType.Link,
          sourceId: susceptibleState.id,
          targetId: flightAction.id
        },
        {
          type: EdgeType.Link,
          sourceId: susceptibleState.id,
          targetId: infectedState.id
        },
        // Transitions
        ...createTransitionEdgeObjs(transmitTransition.id, susceptibleState.id, infectedState.id),
        ...createTransitionEdgeObjs(exogenousTransition.id, susceptibleState.id, infectedState.id),
        ...createTransitionEdgeObjs(recoveryTransition.id, infectedState.id, recoveredState.id),
        ...createTransitionEdgeObjs(immunityLossTransition.id, recoveredState.id, susceptibleState.id)
      ]

      const edges = await Promise.all(
        modelEdges.map(async (edge) => {
          return app.service('edges').create({
            ...baseEdgeData,
            ...edge
          })
        })
      )

      const nodes = await app.service('nodes').find()
      const nodeNameToIdMap = new Map<string, number>()
      const nodeIdToNameMap = new Map<number, string>()
      for (const node of nodes.data) {
        nodeNameToIdMap.set(node.name, node.id)
        nodeIdToNameMap.set(node.id, node.name)
      }

      const actual = await app.service('models').simulate({ id: model.id })

      const file = await readFile(join(__dirname, 'agent-based.xml'), 'utf8')

      const imModel: Model = loadInsightMaker(file)
      imModel.globals = 'SetRandSeed(123)'

      const res = imModel.simulate()

      const expectedData = res._data.data?.map((d: any) => {
        return Object.entries(d).reduce((acc, [key, value]) => {
          acc[res._nameIdMapping[key]] = value
          return acc
        }, {} as any)
      })

      const imModelNameIdMapping = res._nameIdMapping

      assert.deepStrictEqual(actual.times, res._data.times)

      let i = 0
      const allNodeNames = ['Percent Infected', 'Population']
      const actualNodeData = actual.nodes
      assert.strictEqual(Object.keys(actualNodeData).length, allNodeNames.length)
      for (const expectedDataItem of expectedData!) {
        for (const nodeName of allNodeNames) {
          const expectedValue = expectedDataItem[nodeName]
          const nodeId = nodeNameToIdMap.get(nodeName)
          assert.ok(nodeId)
          assert.ok(nodeId in actualNodeData, `Node ${nodeName} not found in actual data`)
          const actualValue = actualNodeData[nodeId].series[i]

          if (typeof expectedValue === 'number') {
            assert.ok(!isNaN(expectedValue))
            assert.ok(typeof actualValue === 'number')
            assert.ok(!isNaN(actualValue))

            const expectedValueAsInt = Math.round(expectedValue)
            const actualValueAsInt = Math.round(actualValue)
            assert.strictEqual(expectedValueAsInt, actualValueAsInt)

            const diff = Math.abs(expectedValue - actualValue)

            assert.ok(
              diff <= 10e-10,
              `Expected ${i} item ${nodeName} to be ${expectedValue} but got ${actualValue}. Diff: ${diff}`
            )
          } else {
            assert.ok(expectedValue.current)
            assert.ok(actualValue)
            assert.ok(typeof actualValue === 'object')
            assert.ok(Array.isArray(expectedValue.current))

            assert.ok(Array.isArray(actualValue))
            let locationIndex = 0
            for (const expectedPosition of expectedValue.current) {
              const expectedLocation = expectedPosition.location.items
              const actualLocation: [number, number] = actualValue[locationIndex].location
              assert.strictEqual(expectedLocation.length, 2)
              assert.strictEqual(actualLocation.length, 2)

              const [expectedX, expectedY] = expectedLocation
              const [actualX, actualY] = actualLocation

              assert.strictEqual(
                expectedX,
                actualX,
                `Expected ${expectedX} but got ${actualX}. ${i}_${locationIndex}`
              )
              assert.strictEqual(
                expectedY,
                actualY,
                `Expected ${expectedY} but got ${actualY}. ${i}_${locationIndex}`
              )

              const expectedStates = expectedPosition.state.map(
                (s: { id: string }) => imModelNameIdMapping[s.id]
              )
              const actualStates = actualValue[locationIndex].state.map((s: number) =>
                nodeIdToNameMap.get(s)
              ) as string[]
              assert.deepStrictEqual(expectedStates, actualStates)

              locationIndex++
            }
          }
        }

        i++
      }
    })

    it('simple agent based', async () => {
      const model = await app.service('models').create({
        name: 'simple-test',
        timeUnits: 'Years',
        timeStart: 0,
        timeLength: 10,
        algorithm: 'Euler'
      })

      const baseNodeData = {
        modelId: model.id
      }

      const personAgent = await app.service('nodes').create({
        name: 'Person',
        type: NodeType.Agent,
        position: { x: 100, y: 0 },
        data: {},
        ...baseNodeData
      })

      const populationPopulation = await app.service('nodes').create({
        name: 'Population',
        type: NodeType.Population,
        position: { x: 100, y: 100 },
        data: {
          agentBaseId: personAgent.id,
          populationSize: 100,
          geoPlacementType: 'Random',
          geoWidth: '200',
          geoHeight: '100',
          networkType: 'None'
        },
        ...baseNodeData
      })

      const startState = await app.service('nodes').create({
        name: 'Start',
        type: NodeType.State,
        position: { x: 100, y: 200 },
        data: {
          startActive: 'true',
          residency: '0'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const endState = await app.service('nodes').create({
        name: 'End',
        type: NodeType.State,
        position: { x: 100, y: 300 },
        data: {
          startActive: 'not [Start]',
          residency: '0'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const transition = await app.service('nodes').create({
        name: 'Transition',
        type: NodeType.Transition,
        position: { x: 100, y: 400 },
        data: {
          trigger: 'Condition',
          value: 'Years=5'
        },
        parentId: personAgent.id,
        ...baseNodeData
      })

      const baseEdgeData = {
        modelId: model.id,
        sourceHandle: '0',
        targetHandle: '0'
      }

      const modelEdges: (Omit<EdgesData, 'modelId' | 'sourceHandle' | 'targetHandle'> & {
        sourceHandle?: string
        targetHandle?: string
      })[] = [
        // Links
        {
          type: EdgeType.Link,
          sourceId: startState.id,
          targetId: endState.id
        },
        // Transitions
        ...createTransitionEdgeObjs(transition.id, startState.id, endState.id)
      ]

      const edges = await Promise.all(
        modelEdges.map(async (edge) => {
          return app.service('edges').create({
            ...baseEdgeData,
            ...edge
          })
        })
      )

      const actual = await app.service('models').simulate({ id: model.id })
    })
  })
})

function createTransitionEdgeObjs(transitionId: number, sourceId: number, targetId: number) {
  return [
    {
      type: EdgeType.Transition,
      sourceId: sourceId,
      targetId: transitionId,
      targetHandle: 'transition-target'
    },
    {
      type: EdgeType.Transition,
      sourceId: transitionId,
      targetId: targetId,
      sourceHandle: 'transition-source'
    }
  ]
}
