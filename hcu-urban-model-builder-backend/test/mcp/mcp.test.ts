import assert from 'assert'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { app } from '../../src/app.js'
import type { User } from '../../src/services/users/users.js'

describe('MCP endpoint', () => {
  const knex = () => app.get('postgresqlClient')
  let server: Server
  let url: string
  let user: User
  let token: string

  const connect = async (accessToken = token) => {
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { Authorization: `Bearer ${accessToken}` } }
    })
    await client.connect(transport)
    return client
  }

  const call = async (client: Client, name: string, args: Record<string, unknown>) => {
    const result: any = await client.callTool({ name, arguments: args })
    return { ...result, text: result.content[0].text as string }
  }

  before(async () => {
    await knex().table('models').del()
    await knex().table('users').del()
    user = await app.service('users').create({ email: 'mcp@example.com' })
    const created = await app
      .service('access-tokens')
      .create({ name: 'Test' }, { user, authenticated: true, provider: 'rest' })
    token = created.token!

    server = createServer(app.callback())
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await knex().table('models').del()
    await knex().table('users').del()
  })

  const initialize = (headers: Record<string, string>) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...headers
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } }
      })
    })

  it('rejects requests without a valid token', async () => {
    for (const headers of [
      {},
      { Authorization: 'Bearer umb_pat_wrong' },
      { Authorization: `Basic ${token}` }
    ]) {
      const response = await initialize(headers as Record<string, string>)
      assert.strictEqual(response.status, 401)
      assert.match(response.headers.get('www-authenticate') ?? '', /^Bearer/)
    }
  })

  it('only accepts POST', async () => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    assert.strictEqual(response.status, 405)
  })

  it('advertises the tools of the tool layer', async () => {
    const client = await connect()
    assert.strictEqual(client.getServerVersion()?.name, 'urban-model-builder')
    assert.match(client.getInstructions() ?? '', /get_modeling_reference/)

    const { tools } = await client.listTools()
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))
    assert.strictEqual(byName['get_model_version'].annotations?.readOnlyHint, true)
    assert.strictEqual(byName['apply_graph_patch'].annotations?.readOnlyHint, false)
    assert.strictEqual(byName['apply_graph_patch'].inputSchema.type, 'object')
    assert.ok(byName['apply_graph_patch'].inputSchema.properties?.createNodes)
    await client.close()
  })

  it('builds and simulates a model on behalf of the owner of the token', async () => {
    const client = await connect()

    const created = await call(client, 'create_model', { name: 'Built via MCP' })
    assert.ok(!created.isError, created.text)
    const { modelId, modelVersionId } = JSON.parse(created.text)

    const model = await app.service('models').get(modelId, { user })
    assert.strictEqual(model.createdBy, user.id)

    const patch = await call(client, 'apply_graph_patch', {
      modelVersionId,
      createNodes: [
        { ref: 'stock', type: 'stock', name: 'Trees', data: { value: '100' } },
        { ref: 'flow', type: 'flow', name: 'Planting', data: { rate: '10' } }
      ],
      createEdges: [{ type: 'flow', source: 'flow', target: 'stock' }]
    })
    assert.ok(!patch.isError, patch.text)

    const simulation = await call(client, 'simulate', { modelVersionId, maxPoints: 3 })
    const trees = JSON.parse(simulation.text).series.find((series: any) => series.name === 'Trees')
    assert.deepStrictEqual(trees.values, [100, 200, 300])
    await client.close()
  })

  it('returns tool errors as results the model can read', async () => {
    const client = await connect()

    const invalid = await call(client, 'get_model_version', { modelVersionId: 'nope' })
    assert.strictEqual(invalid.isError, true)
    assert.match(invalid.text, /^invalid_input/)

    const unknown = await call(client, 'get_model', { modelId: '00000000-0000-4000-8000-000000000000' })
    assert.strictEqual(unknown.isError, true)
    assert.match(unknown.text, /^not_found/)
    await client.close()
  })

  it('stops working when the token is revoked', async () => {
    await knex().table('access_tokens').del()
    await assert.rejects(connect())
  })
})
