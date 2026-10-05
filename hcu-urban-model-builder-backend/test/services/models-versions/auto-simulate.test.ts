import assert from 'assert'
import type { Params } from '@feathersjs/feathers'
import { app } from '../../../src/app.js'

describe('models-versions autoSimulate setting', () => {
  let params: Params
  let internalParams: Params
  let modelId: string
  let modelsVersionsId: string

  before(async () => {
    await app.get('postgresqlClient').table('models').del()
    await app.get('postgresqlClient').table('users').del()

    const user = await app.service('users').create({ email: 'auto-simulate@example.com' })
    params = { user, authenticated: true, provider: 'socketio' }
    internalParams = { user }

    // Created as an external call, so the owner role and the first draft version are set up as in the app.
    const model = await app.service('models').create({ internalName: 'Auto simulate' }, params)
    modelId = model.id
    modelsVersionsId = (await app.service('models').get(model.id, { user })).latestDraftVersionId!
  })

  after(async () => {
    await app.get('postgresqlClient').table('models').del()
  })

  it('is switched off for a new model version', async () => {
    const version = await app.service('models-versions').get(modelsVersionsId, params)

    assert.strictEqual(version.autoSimulate, false)
  })

  it('can be switched on from the client', async () => {
    const patched = await app
      .service('models-versions')
      .patch(modelsVersionsId, { autoSimulate: true }, params)
    const version = await app.service('models-versions').get(modelsVersionsId, params)

    assert.strictEqual(patched.autoSimulate, true)
    assert.strictEqual(version.autoSimulate, true)
  })

  it('rejects a value that is not a boolean', async () => {
    await assert.rejects(
      app.service('models-versions').patch(modelsVersionsId, { autoSimulate: null } as any, params),
      (error: any) => {
        assert.strictEqual(error.name, 'BadRequest')
        return true
      }
    )
  })

  it('is kept by a new draft version', async () => {
    const draft = await app.service('models').newDraft({ id: modelId }, internalParams)

    assert.notStrictEqual(draft.id, modelsVersionsId)
    assert.strictEqual(draft.autoSimulate, true)
  })

  it('is kept by a cloned model', async () => {
    const clone = await app
      .service('models')
      .cloneVersion({ id: modelsVersionsId, internalName: 'Auto simulate clone' }, internalParams)

    assert.notStrictEqual(clone.modelId, modelId)
    assert.strictEqual(clone.autoSimulate, true)
  })

  it('is carried through a model export and import', async () => {
    const exported = await app.service('models').exportModel({ id: modelId }, params)
    const imported = await app.service('models').importModel({ payload: exported }, params)

    assert.ok(exported.modelVersions.every(({ modelVersion }) => modelVersion.autoSimulate === true))
    assert.strictEqual(imported.modelVersion.autoSimulate, true)
  })

  it('is switched off when importing an export from before the setting', async () => {
    const exported = await app.service('models').exportModel({ id: modelId }, params)
    for (const { modelVersion } of exported.modelVersions) {
      delete (modelVersion as { autoSimulate?: boolean }).autoSimulate
    }
    const imported = await app.service('models').importModel({ payload: exported }, params)

    assert.strictEqual(imported.modelVersion.autoSimulate, false)
  })

  it('is taken over when a version export is imported into another version', async () => {
    // The service method only declares `data`; the hooks still read the user from the params.
    const exportVersion = app.service('models-versions').exportVersion as (
      data: { id: string },
      params: Params
    ) => any
    const exported = await exportVersion.call(
      app.service('models-versions'),
      { id: modelsVersionsId },
      params
    )
    const target = await app.service('models').create({ internalName: 'Auto simulate target' }, params)
    const targetVersionId = (await app.service('models').get(target.id, internalParams)).latestDraftVersionId!

    const imported = await app
      .service('models-versions')
      .importVersion({ id: targetVersionId, payload: exported }, params)

    assert.strictEqual(imported.autoSimulate, true)
  })
})
