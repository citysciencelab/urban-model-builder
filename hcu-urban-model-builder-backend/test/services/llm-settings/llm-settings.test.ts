import assert from 'assert'
import { app } from '../../../src/app.js'
import type { User } from '../../../src/services/users/users.js'

const KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef'

describe('llm-settings service', () => {
  const knex = () => app.get('postgresqlClient')
  const service = () => app.service('llm-settings')
  const paramsFor = (user: User) => ({ user, authenticated: true, provider: 'rest' })
  let alice: User
  let bob: User

  before(async () => {
    await knex().table('users').del()
    alice = await app.service('users').create({ email: 'alice@example.com' })
    bob = await app.service('users').create({ email: 'bob@example.com' })
  })

  afterEach(async () => {
    await knex().table('llm_settings').del()
  })

  it('requires authentication and only knows the id "me"', async () => {
    await assert.rejects(service().get('me', { provider: 'rest' }), { name: 'NotAuthenticated' })
    await assert.rejects(service().patch('me', { model: null }, { provider: 'rest' }), {
      name: 'NotAuthenticated'
    })
    await assert.rejects(service().get(bob.id, paramsFor(alice)), { name: 'NotFound' })
  })

  it('starts without a key and lists the configured models', async () => {
    const settings = await service().get('me', paramsFor(alice))
    assert.deepStrictEqual(settings, {
      chatAvailable: true,
      hasOpenRouterKey: false,
      openRouterKeyHint: null,
      model: null,
      defaultModel: app.get('llm').defaultModel,
      availableModels: app.get('llm').models
    })
  })

  it('stores the key encrypted and never returns it', async () => {
    const settings = await service().patch('me', { openRouterKey: `  ${KEY}  ` }, paramsFor(alice))
    assert.strictEqual(settings.hasOpenRouterKey, true)
    assert.strictEqual(settings.openRouterKeyHint, '…cdef')
    assert.ok(!JSON.stringify(settings).includes(KEY))

    const stored = await knex().table('llm_settings').where({ userId: alice.id }).first()
    assert.ok(!JSON.stringify(stored).includes(KEY))
    assert.ok(stored.openRouterKey.startsWith('v1:'))

    assert.strictEqual(await service().getOpenRouterKey(alice.id), KEY)
    assert.strictEqual(await service().getOpenRouterKey(bob.id), null)
    assert.strictEqual((await service().get('me', paramsFor(bob))).hasOpenRouterKey, false)
  })

  it('uses a fresh nonce for every encryption', async () => {
    await service().patch('me', { openRouterKey: KEY }, paramsFor(alice))
    await service().patch('me', { openRouterKey: KEY }, paramsFor(bob))
    const rows = await knex().table('llm_settings').select('openRouterKey')
    assert.notStrictEqual(rows[0].openRouterKey, rows[1].openRouterKey)
  })

  it('cannot decrypt a key that was tampered with', async () => {
    await service().patch('me', { openRouterKey: KEY }, paramsFor(alice))
    const stored = await knex().table('llm_settings').where({ userId: alice.id }).first()
    const parts = stored.openRouterKey.split(':')
    parts[3] = Buffer.from('something else entirely').toString('base64')
    await knex()
      .table('llm_settings')
      .where({ userId: alice.id })
      .update({ openRouterKey: parts.join(':') })

    assert.strictEqual(await service().getOpenRouterKey(alice.id), null)
  })

  it('changes the model without touching the key, and removes the key', async () => {
    const model = app.get('llm').models[1]
    await service().patch('me', { openRouterKey: KEY }, paramsFor(alice))

    let settings = await service().patch('me', { model }, paramsFor(alice))
    assert.strictEqual(settings.model, model)
    assert.strictEqual(settings.hasOpenRouterKey, true)

    settings = await service().patch('me', { openRouterKey: null }, paramsFor(alice))
    assert.strictEqual(settings.hasOpenRouterKey, false)
    assert.strictEqual(settings.openRouterKeyHint, null)
    assert.strictEqual(settings.model, model)
    assert.strictEqual(await service().getOpenRouterKey(alice.id), null)
  })

  it('validates the input', async () => {
    await assert.rejects(service().patch('me', { openRouterKey: 'short' }, paramsFor(alice)), {
      name: 'BadRequest'
    })
    await assert.rejects(service().patch('me', { model: 'unknown/model' }, paramsFor(alice)), {
      name: 'BadRequest'
    })
    await assert.rejects(service().patch('me', { userId: bob.id } as any, paramsFor(alice)), {
      name: 'BadRequest'
    })
  })
})
