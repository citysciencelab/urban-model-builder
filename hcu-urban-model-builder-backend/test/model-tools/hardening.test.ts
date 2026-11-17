import assert from 'assert'
import { app } from '../../src/app.js'
import { pruneToolCalls } from '../../src/model-tools/audit-log.js'
import { callTool, ToolError } from '../../src/model-tools/index.js'
import type { User } from '../../src/services/users/users.js'

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

describe('model tools: limits and log', () => {
  const knex = () => app.get('postgresqlClient')
  const originalLimits = { ...app.get('limits') }
  let counter = 0

  /** A fresh user per test, so that the counters of the rate limiter start at zero. */
  const createUser = (): Promise<User> =>
    app.service('users').create({ email: `limits-${Date.now()}-${counter++}@example.com` })

  const rejectsWith = async (promise: Promise<unknown>, code: string): Promise<ToolError> => {
    try {
      await promise
    } catch (error: any) {
      assert.ok(error instanceof ToolError, String(error))
      assert.strictEqual(error.code, code, error.message)
      return error
    }
    assert.fail(`Expected a ToolError with code ${code}`)
  }

  before(async () => {
    await knex().table('models').del()
    await knex().table('users').del()
  })

  afterEach(async () => {
    Object.assign(app.get('limits'), originalLimits)
    await knex().table('models').del()
    await knex().table('users').del()
  })

  describe('tool call log', () => {
    it('records who did what to which model, and whether it worked', async () => {
      const user = await createUser()
      const { modelId, modelVersionId } = (await callTool(
        app,
        user,
        'create_model',
        { name: 'Secret plan' },
        { source: 'mcp' }
      )) as any
      await callTool(
        app,
        user,
        'apply_graph_patch',
        { modelVersionId, createNodes: [{ type: 'variable', name: 'Confidential', data: { value: '42' } }] },
        { source: 'chat' }
      )
      await rejectsWith(callTool(app, user, 'get_model', { modelId: UNKNOWN_ID }), 'not_found')
      await rejectsWith(callTool(app, user, 'get_model', { modelId: 'nonsense' }), 'invalid_input')
      await callTool(app, user, 'get_model', { modelId })

      const rows = await knex().table('tool_calls').where({ userId: user.id }).orderBy('createdAt')
      assert.deepStrictEqual(
        rows.map((row: any) => [
          row.source,
          row.tool,
          row.ok,
          row.errorCode,
          row.modelId,
          row.modelVersionId
        ]),
        [
          ['mcp', 'create_model', true, null, null, null],
          ['chat', 'apply_graph_patch', true, null, null, modelVersionId],
          ['internal', 'get_model', false, 'not_found', UNKNOWN_ID, null],
          ['internal', 'get_model', false, 'invalid_input', null, null],
          ['internal', 'get_model', true, null, modelId, null]
        ]
      )
      assert.ok(rows.every((row: any) => row.durationMs >= 0))
      // the log holds no content of models
      assert.ok(
        !JSON.stringify(rows).includes('Confidential') && !JSON.stringify(rows).includes('Secret plan')
      )
    })

    it('does not record calls of tools that do not exist', async () => {
      const user = await createUser()
      await rejectsWith(callTool(app, user, 'drop_database', {}), 'unknown_tool')
      assert.strictEqual((await knex().table('tool_calls').where({ userId: user.id })).length, 0)
    })

    it('forgets entries after the retention time', async () => {
      const user = await createUser()
      await callTool(app, user, 'list_models', {})
      await callTool(app, user, 'list_models', {})
      const [old] = await knex().table('tool_calls').where({ userId: user.id })
      const days = app.get('limits').auditLogRetentionDays
      await knex()
        .table('tool_calls')
        .where({ id: old.id })
        .update({ createdAt: new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000) })

      assert.strictEqual(await pruneToolCalls(app), 1)
      assert.strictEqual((await knex().table('tool_calls').where({ userId: user.id })).length, 1)
    })
  })

  describe('rate limits', () => {
    it('limits the tool calls of a user per minute, not those of others', async () => {
      app.get('limits').toolCallsPerMinute = 3
      const user = await createUser()
      const other = await createUser()

      for (let call = 0; call < 3; call++) {
        await callTool(app, user, 'list_models', {})
      }
      const error = await rejectsWith(callTool(app, user, 'list_models', {}), 'rate_limited')
      const { retryAfterSeconds } = error.details as { retryAfterSeconds: number }
      assert.ok(retryAfterSeconds > 0 && retryAfterSeconds <= 60)

      await callTool(app, other, 'list_models', {})

      const rejected = await knex().table('tool_calls').where({ userId: user.id, ok: false })
      assert.deepStrictEqual(
        rejected.map((row: any) => row.errorCode),
        ['rate_limited']
      )
    })

    it('limits simulations separately', async () => {
      app.get('limits').simulationsPerMinute = 1
      const user = await createUser()
      const { modelVersionId } = (await callTool(app, user, 'create_model', { name: 'M' })) as any

      await callTool(app, user, 'simulate', { modelVersionId })
      await rejectsWith(callTool(app, user, 'simulate', { modelVersionId }), 'rate_limited')
      // other tools are not affected
      await callTool(app, user, 'validate_model', { modelVersionId })
    })
  })

  describe('simulations', () => {
    it('stops a simulation that takes too long, while the server keeps working', async () => {
      const user = await createUser()
      const { modelVersionId } = (await callTool(app, user, 'create_model', { name: 'Endless' })) as any
      await callTool(app, user, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'stock', name: 'S', data: { value: '1' } }]
      })
      // warm up, so that the measured time is the simulation and not the start of the thread
      await callTool(app, user, 'simulate', { modelVersionId })

      app.get('limits').simulationTimeoutSeconds = 1
      await callTool(app, user, 'update_simulation_settings', {
        modelVersionId,
        timeLength: 1000000000,
        timeStep: 0.0001
      })

      let ticks = 0
      const interval = setInterval(() => ticks++, 50)
      const startedAt = Date.now()
      const error = await rejectsWith(
        callTool(app, user, 'simulate', { modelVersionId }),
        'simulation_failed'
      )
      clearInterval(interval)

      assert.match(error.message, /took longer than 1 seconds/)
      assert.ok(Date.now() - startedAt < 5000)
      assert.ok(ticks >= 10, `the server thread was blocked (${ticks} ticks)`)

      // the next simulation gets a fresh thread
      await callTool(app, user, 'update_simulation_settings', { modelVersionId, timeLength: 5, timeStep: 1 })
      const simulation: any = await callTool(app, user, 'simulate', { modelVersionId })
      assert.strictEqual(simulation.steps, 6)
    })

    it('runs simulations side by side', async () => {
      const user = await createUser()
      const { modelVersionId } = (await callTool(app, user, 'create_model', { name: 'Parallel' })) as any
      await callTool(app, user, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'variable', name: 'V', data: { value: 'Years()' } }]
      })

      const results: any[] = await Promise.all(
        Array.from({ length: 6 }, () => callTool(app, user, 'simulate', { modelVersionId }))
      )
      assert.ok(results.every((result) => result.series[0].last === 20))
    })
  })
})
