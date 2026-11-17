import assert from 'assert'
import { generateKeyPairSync, type KeyObject } from 'crypto'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import jsonwebtoken from 'jsonwebtoken'
import { app } from '../../src/app.js'
import type { User } from '../../src/services/users/users.js'

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
}

describe('MCP endpoint with OAuth', () => {
  const knex = () => app.get('postgresqlClient')
  const originalMcp = structuredClone(app.get('mcp'))
  const originalIssuer = (app.get('authentication') as any).oidc.issuer

  let backend: Server
  let issuerServer: Server
  let baseUrl: string
  let issuer: string
  let resource: string
  let signingKey: KeyObject
  const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey

  /** An access token as the authorization server issues it for an MCP client. */
  const token = (claims: Record<string, unknown> = {}, key: KeyObject = signingKey) =>
    jsonwebtoken.sign(
      { sub: 'kc-user-1', scope: 'mcp', email: 'oauth@example.com', iss: issuer, aud: resource, ...claims },
      key.export({ type: 'pkcs8', format: 'pem' }),
      { algorithm: 'RS256', keyid: 'test-key', ...(claims.exp ? {} : { expiresIn: 300 }) }
    )

  const call = (accessToken?: string, body: unknown = INITIALIZE) =>
    fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(body)
    })

  before(async () => {
    await knex().table('models').del()
    await knex().table('users').del()

    // A stand-in for the authorization server: OIDC discovery and its signing key
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    signingKey = privateKey
    issuerServer = createServer((request, response) => {
      response.setHeader('Content-Type', 'application/json')
      if (request.url === '/realms/test/.well-known/openid-configuration') {
        response.end(JSON.stringify({ issuer, jwks_uri: `${issuer}/certs` }))
      } else if (request.url === '/realms/test/certs') {
        const jwk = publicKey.export({ format: 'jwk' })
        response.end(JSON.stringify({ keys: [{ ...jwk, kid: 'test-key', use: 'sig', alg: 'RS256' }] }))
      } else {
        response.statusCode = 404
        response.end('{}')
      }
    })
    await new Promise<void>((resolve) => issuerServer.listen(0, '127.0.0.1', resolve))
    issuer = `http://127.0.0.1:${(issuerServer.address() as AddressInfo).port}/realms/test`

    backend = createServer(app.callback())
    await new Promise<void>((resolve) => backend.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`
    resource = `${baseUrl}/mcp`
  })

  beforeEach(() => {
    Object.assign(app.get('mcp'), { publicUrl: resource, oauth: { enabled: true, scope: 'mcp' } })
    ;(app.get('authentication') as any).oidc.issuer = issuer
  })

  afterEach(async () => {
    await knex().table('models').del()
    await knex().table('users').del()
  })

  after(async () => {
    Object.assign(app.get('mcp'), originalMcp)
    ;(app.get('authentication') as any).oidc.issuer = originalIssuer
    await new Promise((resolve) => backend.close(resolve))
    await new Promise((resolve) => issuerServer.close(resolve))
  })

  it('tells clients where to get a token', async () => {
    const response = await call()
    assert.strictEqual(response.status, 401)
    const challenge = response.headers.get('www-authenticate')!
    assert.ok(challenge.includes(`resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/mcp"`))
    assert.ok(challenge.includes('scope="mcp"'))
    assert.strictEqual(response.headers.get('access-control-expose-headers'), 'WWW-Authenticate')

    for (const path of [
      '/.well-known/oauth-protected-resource/mcp',
      '/.well-known/oauth-protected-resource'
    ]) {
      const metadata: any = await (await fetch(baseUrl + path)).json()
      assert.deepStrictEqual(metadata.resource, resource)
      assert.deepStrictEqual(metadata.authorization_servers, [issuer])
      assert.deepStrictEqual(metadata.scopes_supported, ['mcp'])
    }
    assert.strictEqual((await fetch(`${baseUrl}/.well-known/oauth-protected-resource/other`)).status, 404)
  })

  it('accepts a token issued for the endpoint and creates the user on first use', async () => {
    const response = await call(token())
    assert.strictEqual(response.status, 200)

    const users: User[] = await knex().table('users')
    assert.deepStrictEqual(
      users.map((user) => [user.oidcId, user.email]),
      [['kc-user-1', 'oauth@example.com']]
    )

    // the tools act as this user
    const created = await call(token(), {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'create_model', arguments: { name: 'Mine' } }
    })
    const { modelId } = JSON.parse(((await created.json()) as any).result.content[0].text)
    const model = await knex().table('models').where({ id: modelId }).first()
    assert.strictEqual(model.createdBy, users[0].id)
    assert.strictEqual((await knex().table('users')).length, 1, 'the user is not created twice')
  })

  it('recognises a user who signed in to the app before, even without an email in the token', async () => {
    const existing = await app.service('users').create({ email: 'known@example.com', oidcId: 'kc-user-2' })

    assert.strictEqual((await call(token({ sub: 'kc-user-2', email: undefined }))).status, 200)
    assert.deepStrictEqual(
      (await knex().table('users')).map((user: User) => user.id),
      [existing.id]
    )

    // an unknown user cannot be created without an email address
    assert.strictEqual((await call(token({ sub: 'kc-user-3', email: undefined }))).status, 401)
  })

  it('rejects tokens that were not issued for the endpoint', async () => {
    const cases: [string, string, number, string][] = [
      ['a token of the web app', token({ aud: 'account' }), 401, 'invalid_token'],
      ['a token for another resource', token({ aud: 'https://other.example/mcp' }), 401, 'invalid_token'],
      ['a token without audience', token({ aud: undefined }), 401, 'invalid_token'],
      ['a token without the scope', token({ scope: 'email profile' }), 403, 'insufficient_scope'],
      ['an expired token', token({ exp: Math.floor(Date.now() / 1000) - 60 }), 401, 'invalid_token'],
      ['a token of another issuer', token({ iss: 'https://evil.example/realms/test' }), 401, 'invalid_token'],
      ['a token signed with another key', token({}, otherKey), 401, 'invalid_token'],
      ['a token without subject', token({ sub: undefined }), 401, 'invalid_token'],
      ['something that is not a token', 'not-a-jwt', 401, 'invalid_token']
    ]
    for (const [name, accessToken, status, error] of cases) {
      const response = await call(accessToken)
      assert.strictEqual(response.status, status, name)
      assert.ok(response.headers.get('www-authenticate')!.includes(`error="${error}"`), name)
    }
    assert.strictEqual((await knex().table('users')).length, 0, 'no user is created for a rejected token')
  })

  it('does not accept unsigned tokens', async () => {
    const unsigned = jsonwebtoken.sign(
      { sub: 'kc-user-1', scope: 'mcp', email: 'oauth@example.com', iss: issuer, aud: resource },
      '',
      { algorithm: 'none', keyid: 'test-key' }
    )
    assert.strictEqual((await call(unsigned)).status, 401)
  })

  it('keeps accepting personal access tokens', async () => {
    const user = await app.service('users').create({ email: 'pat@example.com' })
    const created = await app
      .service('access-tokens')
      .create({ name: 'Test' }, { user, authenticated: true, provider: 'rest' })

    assert.strictEqual((await call(created.token)).status, 200)
    assert.strictEqual((await call('umb_pat_wrong')).status, 401)
  })

  it('is off unless enabled', async () => {
    app.get('mcp').oauth.enabled = false

    assert.strictEqual((await fetch(`${baseUrl}/.well-known/oauth-protected-resource/mcp`)).status, 404)
    const response = await call(token())
    assert.strictEqual(response.status, 401)
    assert.ok(!response.headers.get('www-authenticate')!.includes('resource_metadata'))
  })
})
