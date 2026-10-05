import assert from 'assert'
import type { Params } from '@feathersjs/feathers'
import { app } from '../../../src/app.js'

// A minimal stand-in for a simulation result; only the number of runs matters here.
const run = (index: number) => ({ nodes: {}, times: [index] })
const batch = (runCount: number) => {
  const runs = Array.from({ length: runCount }, (_, index) => run(index))
  return runCount > 1 ? { ...runs[0], batchResults: runs, batchScenarios: runs.map(() => ({})) } : runs[0]
}

describe('models service simulation results', () => {
  const maxRuns = app.get('maxSimulationBatchRuns')
  let params: Params
  let modelsVersionsId: string

  before(async () => {
    await app.get('postgresqlClient').table('models').del()
    await app.get('postgresqlClient').table('users').del()

    const user = await app.service('users').create({ email: 'simulation-results@example.com' })
    params = { user, authenticated: true, provider: 'socketio' }

    // Created as an external call, so the owner role and the first draft version are set up as in the app.
    const model = await app.service('models').create({ internalName: 'Simulation results' }, params)
    modelsVersionsId = (await app.service('models').get(model.id, { user })).latestDraftVersionId!
  })

  after(async () => {
    await app.get('postgresqlClient').table('models').del()
  })

  const save = (runCount: number) =>
    app.service('models').saveSimulationResult(
      { modelsVersionsId, name: `Batch ${runCount}`, scenario: {}, result: batch(runCount) },
      params
    )

  it('reads the batch ceiling of 5 runs from the configuration', () => {
    assert.strictEqual(maxRuns, 5)
  })

  it('saves a batch with the maximum number of runs', async () => {
    const saved = await save(maxRuns)

    assert.strictEqual(saved.result.batchResults.length, maxRuns)
  })

  it('rejects a batch with more runs than the maximum', async () => {
    await assert.rejects(save(maxRuns + 1), (error: any) => {
      assert.strictEqual(error.name, 'BadRequest')
      return true
    })
  })

  it('adds runs to a stored result until the maximum is reached', async () => {
    const saved = await save(maxRuns - 1)

    const updated = await app
      .service('models')
      .addSimulationResultRun({ id: saved.id, run: run(maxRuns - 1), scenario: {} }, params)
    assert.strictEqual(updated.result.batchResults.length, maxRuns)

    await assert.rejects(
      app.service('models').addSimulationResultRun({ id: saved.id, run: run(maxRuns), scenario: {} }, params),
      (error: any) => {
        assert.strictEqual(error.name, 'BadRequest')
        return true
      }
    )
  })

  it('keeps an older result with more runs readable but does not let it grow', async () => {
    // Results saved under the former ceiling of 50 runs.
    const [legacy] = await app
      .get('postgresqlClient')('simulation_results')
      .insert({ modelsVersionsId, name: 'Legacy', scenario: {}, result: batch(maxRuns + 2) })
      .returning('*')

    const { data } = await app
      .service('models')
      .findSimulationResults({ modelsVersionsId, $limit: 100 }, params)
    const found = data.find((result: any) => result.id === legacy.id)
    assert.strictEqual(found.result.batchResults.length, maxRuns + 2)

    await assert.rejects(
      app.service('models').addSimulationResultRun({ id: legacy.id, run: run(0), scenario: {} }, params),
      (error: any) => {
        assert.strictEqual(error.name, 'BadRequest')
        return true
      }
    )
  })
})
