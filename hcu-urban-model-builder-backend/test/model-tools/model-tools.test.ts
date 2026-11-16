import assert from 'assert'
import { app } from '../../src/app.js'
import { EdgeType, NodeType, Roles } from '../../src/client.js'
import { callTool, listTools, ToolError } from '../../src/model-tools/index.js'
import { sampleIndices } from '../../src/model-tools/simulation-summary.js'
import type { User } from '../../src/services/users/users.js'

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

async function assertToolError(
  promise: Promise<unknown>,
  code: string,
  messagePattern?: RegExp
): Promise<any> {
  try {
    await promise
  } catch (error: any) {
    assert.ok(error instanceof ToolError, `Expected a ToolError, got ${error}`)
    assert.strictEqual(error.code, code, error.message)
    if (messagePattern) {
      assert.match(error.message, messagePattern)
    }
    return error
  }
  assert.fail(`Expected a ToolError with code ${code}`)
}

describe('model tools', () => {
  const knex = () => app.get('postgresqlClient')
  let owner: User
  let viewer: User
  let outsider: User

  const createModel = async (name = 'Test Model') =>
    (await callTool(app, owner, 'create_model', { name })) as { modelId: string; modelVersionId: string }

  const getGraph = async (modelVersionId: string, user = owner) =>
    (await callTool(app, user, 'get_model_version', { modelVersionId })) as {
      editable: boolean
      nodes: any[]
      edges: any[]
    }

  /** A small population model: births fill a stock, deaths drain it. */
  const populationPatch = (modelVersionId: string) => ({
    modelVersionId,
    createNodes: [
      { ref: 'population', type: 'stock', name: 'Population', data: { value: 1000 } },
      { ref: 'births', type: 'flow', name: 'Births', data: { rate: '[Population] * [Birth Rate]' } },
      { ref: 'deaths', type: 'flow', name: 'Deaths', data: { rate: '[Population] * 0.01' } },
      {
        ref: 'birthRate',
        type: 'variable',
        name: 'Birth Rate',
        data: { value: '0.03' },
        isParameter: true,
        parameterMin: 0,
        parameterMax: 0.1
      }
    ],
    createEdges: [
      { type: 'flow', source: 'births', target: 'population' },
      { type: 'flow', source: 'population', target: 'deaths' }
    ]
  })

  before(async () => {
    await knex().table('models').del()
    await knex().table('users').del()
    owner = await app.service('users').create({ email: 'owner@example.com' })
    viewer = await app.service('users').create({ email: 'viewer@example.com' })
    outsider = await app.service('users').create({ email: 'outsider@example.com' })
  })

  afterEach(async () => {
    await knex().table('models').del()
  })

  describe('registry', () => {
    it('lists the tools with JSON schemas', () => {
      const tools = listTools()
      const names = tools.map((tool) => tool.name)
      assert.ok(names.includes('apply_graph_patch'))
      assert.ok(names.includes('simulate'))
      for (const tool of tools) {
        assert.strictEqual((tool.inputSchema as any).type, 'object', tool.name)
        assert.ok(tool.description.length > 20, tool.name)
      }
    })

    it('rejects unknown tools and invalid input', async () => {
      await assertToolError(callTool(app, owner, 'drop_database', {}), 'unknown_tool')
      await assertToolError(
        callTool(app, owner, 'get_model_version', { modelVersionId: 'abc' }),
        'invalid_input'
      )
      await assertToolError(
        callTool(app, owner, 'create_model', { name: 'A', unexpected: true }),
        'invalid_input',
        /unexpected/
      )
    })
  })

  describe('models', () => {
    it('creates a model with an editable draft and lists it for its owner only', async () => {
      const { modelId, modelVersionId } = await createModel('Housing Demand')
      assert.ok(modelVersionId)

      const mine: any = await callTool(app, owner, 'list_models', { search: 'housing' })
      assert.deepStrictEqual(
        mine.models.map((model: any) => [model.id, model.role]),
        [[modelId, 'owner']]
      )
      const others: any = await callTool(app, outsider, 'list_models', {})
      assert.strictEqual(others.models.length, 0)

      const model: any = await callTool(app, owner, 'get_model', { modelId })
      assert.strictEqual(model.versions.length, 1)
      assert.strictEqual(model.versions[0].id, modelVersionId)
      assert.strictEqual(model.versions[0].state, 'draft')

      const graph = await getGraph(modelVersionId)
      assert.strictEqual(graph.editable, true)
      assert.deepStrictEqual(graph.nodes, [])
    })

    it('changes simulation settings', async () => {
      const { modelVersionId } = await createModel()
      const version: any = await callTool(app, owner, 'update_simulation_settings', {
        modelVersionId,
        timeUnits: 'Months',
        timeLength: 36
      })
      assert.strictEqual(version.settings.timeUnits, 'Months')
      assert.strictEqual(version.settings.timeLength, 36)
      assert.strictEqual(version.settings.timeStep, 1)
    })

    it('clones a version into a new model', async () => {
      const { modelVersionId } = await createModel()
      await callTool(app, owner, 'apply_graph_patch', populationPatch(modelVersionId))

      const copy: any = await callTool(app, owner, 'clone_model_version', { modelVersionId, name: 'Copy' })
      assert.notStrictEqual(copy.id, modelVersionId)
      assert.strictEqual((await getGraph(copy.id)).nodes.length, 4)
    })
  })

  describe('apply_graph_patch', () => {
    it('builds a stock and flow model that can be simulated', async () => {
      const { modelVersionId } = await createModel()
      const result: any = await callTool(app, owner, 'apply_graph_patch', populationPatch(modelVersionId))

      assert.strictEqual(result.createdNodes.length, 4)
      assert.deepStrictEqual(result.warnings, [])
      assert.deepStrictEqual(result.issues, [])
      // the reference to [Birth Rate] got its link, the flows need none to their own stock
      const autoLinks = result.createdEdges.filter((edge: any) => edge.autoLinked)
      assert.strictEqual(autoLinks.length, 1)
      const id = Object.fromEntries(result.createdNodes.map((node: any) => [node.ref, node.id]))
      assert.deepStrictEqual([autoLinks[0].source, autoLinks[0].target], [id.birthRate, id.births])

      const simulation: any = await callTool(app, owner, 'simulate', { modelVersionId, maxPoints: 5 })
      assert.strictEqual(simulation.steps, 21)
      assert.strictEqual(simulation.sampledTimes.length, 5)
      const population = simulation.series.find((series: any) => series.name === 'Population')
      assert.strictEqual(population.first, 1000)
      // 2 % net growth per year with Euler steps of one year
      assert.ok(Math.abs(population.last - 1000 * 1.02 ** 20) < 0.01, `last: ${population.last}`)
      assert.strictEqual(population.values.length, 5)

      const override: any = await callTool(app, owner, 'simulate', {
        modelVersionId,
        parameterValues: { [id.birthRate]: 0.01 }
      })
      const steady = override.series.find((series: any) => series.name === 'Population')
      assert.strictEqual(steady.last, 1000)
    })

    it('arranges new nodes and chooses the handles of the editor', async () => {
      const { modelVersionId } = await createModel()
      await callTool(app, owner, 'apply_graph_patch', populationPatch(modelVersionId))

      const nodes = (await app.service('nodes').find({ query: { modelsVersionsId: modelVersionId } })).data
      const positions = new Set(nodes.map((node) => `${node.position.x}/${node.position.y}`))
      assert.strictEqual(positions.size, nodes.length, 'every node has its own position')

      const byName = Object.fromEntries(nodes.map((node) => [node.name, node]))
      assert.ok(byName['Births'].position.x < byName['Population'].position.x)
      assert.ok(byName['Population'].position.x < byName['Deaths'].position.x)
      assert.strictEqual(byName['Births'].data.direction, 'right')

      const edges = (await app.service('edges').find({ query: { modelsVersionsId: modelVersionId } })).data
      const inflow = edges.find(
        (edge) => edge.type === EdgeType.Flow && edge.sourceId === byName['Births'].id
      )!
      assert.deepStrictEqual([inflow.sourceHandle, inflow.targetHandle], ['flow-source', 'target-left'])
      const outflow = edges.find(
        (edge) => edge.type === EdgeType.Flow && edge.targetId === byName['Deaths'].id
      )!
      assert.deepStrictEqual([outflow.sourceHandle, outflow.targetHandle], ['source-right', 'flow-target'])
      const link = edges.find((edge) => edge.type === EdgeType.Link)!
      assert.match(link.sourceHandle, /^source-(top|right|bottom|left)$/)
      assert.match(link.targetHandle, /^target-[01]$/)
    })

    it('keeps existing nodes in place when nodes are added', async () => {
      const { modelVersionId } = await createModel()
      await callTool(app, owner, 'apply_graph_patch', populationPatch(modelVersionId))
      const before = (await getGraph(modelVersionId)).nodes

      await callTool(app, owner, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'variable', name: 'Density', data: { value: '[Population] / 755' } }]
      })

      const after = (await getGraph(modelVersionId)).nodes
      for (const node of before) {
        assert.deepStrictEqual(after.find((other) => other.id === node.id).position, node.position)
      }
      const added = after.find((node) => node.name === 'Density')
      assert.ok(added.position.y > Math.max(...before.map((node) => node.position.y)))
    })

    it('creates the default scenario value of a parameter', async () => {
      const { modelVersionId } = await createModel()
      await callTool(app, owner, 'apply_graph_patch', populationPatch(modelVersionId))

      const scenario = await app.service('scenarios')._findDefaultForModelVersion(modelVersionId)
      assert.ok(scenario)
      const values = await app.service('scenarios-values').find({ query: { scenariosId: scenario.id } })
      assert.deepStrictEqual(
        values.data.map((value) => value.value),
        [0.03]
      )
    })

    it('updates and deletes nodes including their edges', async () => {
      const { modelVersionId } = await createModel()
      const created: any = await callTool(app, owner, 'apply_graph_patch', populationPatch(modelVersionId))
      const id = Object.fromEntries(created.createdNodes.map((node: any) => [node.ref, node.id]))

      const result: any = await callTool(app, owner, 'apply_graph_patch', {
        modelVersionId,
        updateNodes: [{ id: id.population, name: 'Residents', data: { value: '2000', nonNegative: true } }],
        deleteNodeIds: [id.births]
      })
      assert.deepStrictEqual(result.updatedNodeIds, [id.population])
      assert.deepStrictEqual(result.deletedNodeIds, [id.births])
      // the flow edge to the stock and the link from the birth rate
      assert.strictEqual(result.deletedEdgeIds.length, 2)

      const graph = await getGraph(modelVersionId)
      assert.strictEqual(graph.nodes.length, 3)
      assert.strictEqual(graph.edges.length, 1)
      const stock = graph.nodes.find((node) => node.id === id.population)
      assert.strictEqual(stock.name, 'Residents')
      assert.deepStrictEqual(stock.data, { value: '2000', nonNegative: true })
      // the remaining flow still references the old name
      assert.ok(result.issues.some((issue: any) => /\[Population\]/.test(issue.message)))
    })

    it('builds an agent with its content inside', async () => {
      const { modelVersionId } = await createModel()
      const result: any = await callTool(app, owner, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [
          { ref: 'person', type: 'agent', name: 'Person' },
          { ref: 'healthy', type: 'state', name: 'Healthy', parent: 'person', data: { startActive: true } },
          {
            ref: 'infected',
            type: 'state',
            name: 'Infected',
            parent: 'person',
            data: { startActive: false }
          },
          {
            ref: 'infection',
            type: 'transition',
            name: 'Infection',
            parent: 'person',
            data: { trigger: 'Probability', value: '0.1' }
          },
          {
            ref: 'people',
            type: 'population',
            name: 'People',
            data: { populationSize: 20, geoWidth: 200, geoHeight: 100 }
          }
        ],
        createEdges: [
          { type: 'transition', source: 'healthy', target: 'infection' },
          { type: 'transition', source: 'infection', target: 'infected' },
          { type: 'agent-population', source: 'person', target: 'people' }
        ]
      })
      assert.deepStrictEqual(result.issues, [])
      const id = Object.fromEntries(result.createdNodes.map((node: any) => [node.ref, node.id]))

      const nodes = (await app.service('nodes').find({ query: { modelsVersionsId: modelVersionId } })).data
      const agent = nodes.find((node) => node.id === id.person)!
      const children = nodes.filter((node) => node.parentId === id.person)
      assert.strictEqual(children.length, 3)
      for (const child of children) {
        assert.ok(
          child.position.x > 0 && child.position.x < agent.width!,
          `${child.name} is inside horizontally`
        )
        assert.ok(
          child.position.y > 0 && child.position.y < agent.height!,
          `${child.name} is inside vertically`
        )
      }
      const edges = (await app.service('edges').find({ query: { modelsVersionsId: modelVersionId } })).data
      const agentEdge = edges.find((edge) => edge.type === EdgeType.AgentPopulation)!
      assert.match(agentEdge.sourceHandle, /^agent-source-/)

      const simulation: any = await callTool(app, owner, 'simulate', { modelVersionId, maxPoints: 3 })
      const people = simulation.series.find((series: any) => series.name === 'People')
      assert.strictEqual(people.agentCount, 20)
      assert.strictEqual(people.stateCounts[0].Healthy, 20)
    })

    it('reports all problems of a patch and changes nothing', async () => {
      const { modelVersionId } = await createModel()
      const error = await assertToolError(
        callTool(app, owner, 'apply_graph_patch', {
          modelVersionId,
          createNodes: [
            { ref: 'a', type: 'stock', name: 'A', data: { initial: '1' } },
            { ref: 'b', type: 'variable', name: 'B', isParameter: true }
          ],
          createEdges: [
            { type: 'flow', source: 'a', target: 'b' },
            { type: 'link', source: 'a', target: 'missing' }
          ],
          deleteNodeIds: [UNKNOWN_ID]
        }),
        'invalid_input'
      )
      assert.strictEqual(error.details.errors.length, 5)
      assert.match(error.message, /unknown data field "initial"/)
      assert.deepStrictEqual((await getGraph(modelVersionId)).nodes, [])
    })

    it('rolls back completely and emits no events when a write fails', async () => {
      const { modelVersionId } = await createModel()
      const events: string[] = []
      const listener = (node: any) => events.push(node.name)
      app.service('nodes').on('created', listener)

      try {
        // the second node passes the checks of the tool but not the schema of the service
        await assertToolError(
          callTool(app, owner, 'apply_graph_patch', {
            modelVersionId,
            createNodes: [
              { type: 'variable', name: 'Fine', data: { value: '1' } },
              { type: 'variable', name: 'Broken', data: { constraints: 'not an object' } }
            ]
          }),
          'invalid_input'
        )
        assert.deepStrictEqual((await getGraph(modelVersionId)).nodes, [])
        assert.deepStrictEqual(events, [])

        await callTool(app, owner, 'apply_graph_patch', {
          modelVersionId,
          createNodes: [{ type: 'variable', name: 'Fine', data: { value: '1' } }]
        })
        assert.deepStrictEqual(events, ['Fine'])
      } finally {
        app.service('nodes').off('created', listener)
      }
    })
  })

  describe('permissions', () => {
    let modelId: string
    let modelVersionId: string

    beforeEach(async () => {
      ;({ modelId, modelVersionId } = await createModel())
      await app.service('models-users').create({ modelId, userId: viewer.id, role: Roles.viewer })
    })

    it('hides models from users without access', async () => {
      await assertToolError(getGraph(modelVersionId, outsider), 'not_found')
      await assertToolError(callTool(app, outsider, 'simulate', { modelVersionId }), 'not_found')
      await assertToolError(
        callTool(app, outsider, 'apply_graph_patch', populationPatch(modelVersionId)),
        'not_found'
      )
      await assertToolError(callTool(app, outsider, 'get_model', { modelId }), 'not_found')
    })

    it('lets viewers read but not edit', async () => {
      const graph = await getGraph(modelVersionId, viewer)
      assert.strictEqual(graph.editable, false)
      await callTool(app, viewer, 'simulate', { modelVersionId })

      await assertToolError(
        callTool(app, viewer, 'apply_graph_patch', populationPatch(modelVersionId)),
        'forbidden'
      )
      await assertToolError(
        callTool(app, viewer, 'update_simulation_settings', { modelVersionId, timeLength: 5 }),
        'forbidden'
      )
      await assertToolError(callTool(app, viewer, 'auto_layout', { modelVersionId }), 'forbidden')
      await assertToolError(callTool(app, viewer, 'new_draft', { modelId }), 'forbidden')
      assert.deepStrictEqual((await getGraph(modelVersionId)).nodes, [])
    })

    it('does not edit published versions', async () => {
      await knex().table('models_versions').where({ id: modelVersionId }).update({ publishedAt: new Date() })

      await assertToolError(
        callTool(app, owner, 'apply_graph_patch', populationPatch(modelVersionId)),
        'conflict',
        /new_draft/
      )
      // published versions are readable for everyone
      assert.strictEqual((await getGraph(modelVersionId, outsider)).editable, false)
    })
  })

  describe('validate_model and auto_layout', () => {
    it('finds references to unknown nodes', async () => {
      const { modelVersionId } = await createModel()
      const patch: any = await callTool(app, owner, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'variable', name: 'Demand', data: { value: '[Households] * 2' } }]
      })
      assert.strictEqual(patch.warnings.length, 1)

      const result: any = await callTool(app, owner, 'validate_model', { modelVersionId })
      assert.strictEqual(result.valid, false)
      assert.match(result.issues[0].message, /\[Households\]/)
    })

    it('rearranges a model', async () => {
      const { modelVersionId } = await createModel()
      const patch = populationPatch(modelVersionId)
      await callTool(app, owner, 'apply_graph_patch', {
        ...patch,
        createNodes: patch.createNodes.map((node) => ({ ...node, position: { x: 0, y: 0 } }))
      })

      const result: any = await callTool(app, owner, 'auto_layout', { modelVersionId })
      assert.strictEqual(result.updatedEdges, 3)
      const nodes = (await getGraph(modelVersionId)).nodes
      assert.strictEqual(new Set(nodes.map((node) => `${node.position.x}/${node.position.y}`)).size, 4)
    })
  })

  describe('simulate', () => {
    it('reports the node of a failing equation', async () => {
      const { modelVersionId } = await createModel()
      await callTool(app, owner, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'variable', name: 'Broken', data: { value: '1 +* 2' } }]
      })
      const error = await assertToolError(
        callTool(app, owner, 'simulate', { modelVersionId }),
        'simulation_failed'
      )
      assert.strictEqual(error.details.nodeName, 'Broken')
    })

    it('does not fetch from hosts other than the default geodata endpoint', async () => {
      const { modelVersionId } = await createModel()
      await app.service('nodes').create({
        modelsVersionsId: modelVersionId,
        type: NodeType.OgcApiFeatures,
        name: 'Internal',
        data: { baseUrl: 'http://169.254.169.254/latest', collectionId: 'meta-data' },
        position: { x: 0, y: 0 },
        isParameter: false,
        isOutputParameter: false
      })
      await assertToolError(callTool(app, owner, 'simulate', { modelVersionId }), 'forbidden', /169\.254/)
    })
  })

  describe('sampleIndices', () => {
    it('spreads the samples evenly and keeps both ends', () => {
      assert.deepStrictEqual(sampleIndices(3, 5), [0, 1, 2])
      assert.deepStrictEqual(sampleIndices(21, 5), [0, 5, 10, 15, 20])
      assert.deepStrictEqual(sampleIndices(100, 2), [0, 99])
    })
  })
})
