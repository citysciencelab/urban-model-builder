// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../../src/app.js'
import { Params } from '@feathersjs/feathers'
import { EdgesData, EdgeType, NodeType } from '../../../../src/client.js'
import initJobQueue from '../../../../src/init-job-queue.js'
import { has } from 'lodash'

describe.only('ogcapi/processes service', () => {
  let params: Params

  before(async () => {
    await app.get('postgresqlClient').table('models').del()
    await initJobQueue(app)

    const model = await app.service('models').create(
      {
        internalName: 'Basic SD Model',
        description: 'A basic model with stocks and flows'
      }
      // params
    )

    const modelVersion = await app.service('models-versions').create({
      modelId: model.id,
      draftVersion: 1,
      minorVersion: 0,
      majorVersion: 0,
      timeUnits: 'Years',
      timeStart: 0,
      timeLength: 200,
      publishedToUMPAt: new Date().toISOString()
    })

    const baseNodeData = {
      modelsVersionsId: modelVersion.id,
      height: null,
      width: null,
      parentId: null,
      isParameter: false,
      isOutputParameter: false
    }

    const childrenPerWomanVar = await app.service('nodes').create({
      name: 'Children per Woman',
      type: NodeType.Variable,
      data: { value: '1.5' },
      position: { x: 100, y: 0 },
      ...baseNodeData,
      isParameter: true,
      parameterType: 'slider',
      parameterMin: 1,
      parameterMax: 5,
      parameterStep: 0.1
    })

    const totalPopulationVar = await app.service('nodes').create({
      name: 'Total Population',
      type: NodeType.Variable,
      data: {
        value: '[Population 19 plus]+[Population 0-18]'
      },
      position: { x: 100, y: 100 },
      ...baseNodeData,
      isOutputParameter: true
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

    const population19PlusStockGhost = await app.service('nodes').create({
      type: NodeType.Ghost,
      position: { x: 100, y: 1000 },
      data: {},
      ghostParentId: population19PlusStock.id,
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
      ...baseNodeData,
      isParameter: true,
      parameterType: 'select',
      parameterMin: 0,
      parameterMax: 1,
      parameterStep: 0.01,
      parameterOptions: {
        data: [
          { value: 0, label: '0%' },
          { value: 0.05, label: '5%' },
          { value: 0.1, label: '10%' },
          { value: 0.2, label: '20%' }
        ]
      }
    })

    const baseEdgeData = {
      modelsVersionsId: modelVersion.id,
      sourceHandle: '0',
      targetHandle: '0'
    }

    const modelEdges: (Omit<EdgesData, 'modelsVersionsId' | 'sourceHandle' | 'targetHandle'> & {
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
        sourceId: population19PlusStockGhost.id,
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
        targetId: population19PlusStockGhost.id,
        sourceHandle: 'flow-source',
        type: EdgeType.Flow
      },
      {
        sourceId: population19PlusStockGhost.id,
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
  })

  after(async () => {})
  it('registered the service', () => {
    const service = app.service('ogcapi/processes')

    assert.ok(service, 'Registered the service')
  })

  it('should list available processes', async () => {
    const service = app.service('ogcapi/processes')
    const processes = await service.find()
    assert.ok(processes, 'Processes listed')
  })

  it('should get a process by id', async () => {
    const service = app.service('ogcapi/processes')
    const processes = await service.find()
    const process = await service.get(processes.processes[0].id)
    assert.ok(process, 'Process retrieved')
  })

  it('should execute a process and create a job', async () => {
    const processes = await app.service('ogcapi/processes').find()

    const job = await app
      .service('ogcapi/processes/:processId/execution')
      .create({ children_per_woman: 6.1 }, { route: { processId: processes.processes[0].id } })
    assert.ok(job, 'Job created')
    assert.ok(job.jobId, 'Job ID returned')
    assert.equal(job.state, 'accepted', 'Job state is accepted')
    const jobDetails = await app.service('ogcapi/jobs').get(job.jobId)
    assert.ok(jobDetails, 'Job details retrieved')
    console.dir(jobDetails, { depth: null })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const jobResults = await app.service('ogcapi/jobs/:jobId/results').find({ route: { jobId: job.jobId } })

    console.dir(jobResults, { depth: null })
  })

  it('should not be possible to execute a process without required parameters', async () => {
    const service = app.service('ogcapi/processes/:processId/execution')
    let hasError = true
    try {
      await service.create({}, { route: { processId: '1' } })
      hasError = false
    } catch (error: any) {
      assert.ok(error, 'Error thrown')
      assert.strictEqual(error.code, 404)
    }
    assert.ok(hasError)
  })
})
