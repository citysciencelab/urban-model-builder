import assert from 'assert'
import { app } from '../../../src/app.js'
import { ACCESS_TOKEN_PREFIX, resolveAccessToken } from '../../../src/services/access-tokens/token.js'
import type { User } from '../../../src/services/users/users.js'

describe('access-tokens service', () => {
  const knex = () => app.get('postgresqlClient')
  const service = () => app.service('access-tokens')
  const paramsFor = (user: User) => ({ user, authenticated: true, provider: 'rest' })
  let alice: User
  let bob: User

  before(async () => {
    await knex().table('users').del()
    alice = await app.service('users').create({ email: 'alice@example.com' })
    bob = await app.service('users').create({ email: 'bob@example.com' })
  })

  afterEach(async () => {
    await knex().table('access_tokens').del()
  })

  it('requires authentication', async () => {
    await assert.rejects(service().find({ provider: 'rest' }), { name: 'NotAuthenticated' })
    await assert.rejects(service().create({ name: 'x' }, { provider: 'rest' }), { name: 'NotAuthenticated' })
  })

  it('shows the token once and stores only its hash', async () => {
    const created = await service().create({ name: 'Claude Desktop' }, paramsFor(alice))
    assert.ok(created.token?.startsWith(ACCESS_TOKEN_PREFIX))
    assert.ok(created.token!.startsWith(created.tokenPrefix))
    assert.strictEqual(created.tokenHash, undefined)
    assert.strictEqual(created.userId, alice.id)

    const days = (new Date(created.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    assert.ok(days > 89.9 && days <= 90, `expires in ${days} days`)

    const stored = await knex().table('access_tokens').where({ id: created.id }).first()
    assert.ok(!JSON.stringify(stored).includes(created.token!))

    const listed = await service().find(paramsFor(alice))
    assert.strictEqual(listed.total, 1)
    assert.strictEqual(listed.data[0].token, undefined)
    assert.strictEqual(listed.data[0].tokenHash, undefined)
  })

  it('validates the request', async () => {
    await assert.rejects(service().create({ name: '' }, paramsFor(alice)), { name: 'BadRequest' })
    await assert.rejects(service().create({ name: 'x', expiresInDays: 366 }, paramsFor(alice)), {
      name: 'BadRequest'
    })
    await assert.rejects(
      service().create({ name: 'x', userId: bob.id } as any, paramsFor(alice)),
      { name: 'BadRequest' },
      'a token cannot be created for another user'
    )
  })

  it('keeps the tokens of other users out of reach', async () => {
    const created = await service().create({ name: 'Mine' }, paramsFor(alice))

    assert.strictEqual((await service().find(paramsFor(bob))).total, 0)
    await assert.rejects(service().remove(created.id, paramsFor(bob)), { name: 'NotFound' })
    assert.ok(await resolveAccessToken(app, created.token!))
  })

  it('resolves a token to its user until it expires or is revoked', async () => {
    const created = await service().create({ name: 'Mine', expiresInDays: 1 }, paramsFor(alice))
    const token = created.token!

    assert.strictEqual((await resolveAccessToken(app, token))?.id, alice.id)
    assert.ok((await service().find(paramsFor(alice))).data[0].lastUsedAt)
    assert.strictEqual(await resolveAccessToken(app, token + 'x'), null)
    assert.strictEqual(await resolveAccessToken(app, 'not-a-token'), null)

    await knex()
      .table('access_tokens')
      .where({ id: created.id })
      .update({ expiresAt: new Date(Date.now() - 1000) })
    assert.strictEqual(await resolveAccessToken(app, token), null)

    await knex()
      .table('access_tokens')
      .where({ id: created.id })
      .update({ expiresAt: new Date(Date.now() + 60000) })
    await service().remove(created.id, paramsFor(alice))
    assert.strictEqual(await resolveAccessToken(app, token), null)
  })
})
