import assert from 'assert'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import type { AddressInfo } from 'net'
import { app } from '../../../src/app.js'
import { Roles } from '../../../src/client.js'
import { callTool } from '../../../src/model-tools/index.js'
import type { ChatResponse } from '../../../src/services/chat/chat.js'
import type { User } from '../../../src/services/users/users.js'

const KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef'
const REQUEST_ID = '11111111-1111-4111-8111-111111111111'

type Reply = { status?: number; body?: unknown; chunks?: unknown[]; delayMs?: number }

/** Server-sent events of a streamed text answer. */
const textReply = (...parts: string[]): Reply => ({
  chunks: [
    ...parts.map((content) => ({ choices: [{ delta: { content } }] })),
    { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 10 } }
  ]
})

/** A streamed answer that asks for one tool call, with the arguments split as providers do. */
const toolReply = (name: string, args: unknown, id = 'call_1'): Reply => {
  const json = JSON.stringify(args)
  const half = Math.ceil(json.length / 2)
  return {
    chunks: [
      {
        choices: [
          { delta: { tool_calls: [{ index: 0, id, type: 'function', function: { name, arguments: '' } }] } }
        ]
      },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: json.slice(0, half) } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: json.slice(half) } }] } }] },
      {
        choices: [{ delta: {}, finish_reason: 'tool_calls' }],
        usage: { prompt_tokens: 50, completion_tokens: 5 }
      }
    ]
  }
}

describe('chat service', () => {
  const knex = () => app.get('postgresqlClient')
  const paramsFor = (user: User) => ({ user, authenticated: true, provider: 'socketio' })
  let owner: User
  let viewer: User
  let outsider: User
  let modelId: string
  let modelVersionId: string

  // A stand-in for OpenRouter that answers with the queued replies and records the requests
  let server: Server
  let replies: Reply[] = []
  let requests: { authorization?: string; body: any }[] = []
  const originalLlmConfig = { ...app.get('llm') }

  const chat = (user: User, overrides: Record<string, unknown> = {}): Promise<ChatResponse> =>
    app.service('chat').create(
      {
        requestId: REQUEST_ID,
        modelVersionId,
        messages: [{ role: 'user', content: 'Add a stock for trees.' }],
        ...overrides
      } as any,
      paramsFor(user)
    ) as Promise<ChatResponse>

  before(async () => {
    await knex().table('models').del()
    await knex().table('users').del()
    owner = await app.service('users').create({ email: 'owner@example.com' })
    viewer = await app.service('users').create({ email: 'viewer@example.com' })
    outsider = await app.service('users').create({ email: 'outsider@example.com' })
    for (const user of [owner, viewer, outsider]) {
      await app.service('llm-settings').patch('me', { openRouterKey: KEY }, { user })
    }

    server = createServer((request: IncomingMessage, response: ServerResponse) => {
      let raw = ''
      request.on('data', (chunk) => (raw += chunk))
      request.on('end', async () => {
        requests.push({ authorization: request.headers.authorization, body: JSON.parse(raw) })
        const reply = replies.shift() ?? { status: 500, body: { error: { message: 'no reply queued' } } }
        if (reply.delayMs) {
          await new Promise((resolve) => setTimeout(resolve, reply.delayMs))
        }
        if (!reply.chunks) {
          response.writeHead(reply.status ?? 200, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify(reply.body ?? {}))
          return
        }
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.write(': OPENROUTER PROCESSING\n\n')
        for (const chunk of reply.chunks) {
          response.write(`data: ${JSON.stringify(chunk)}\n\n`)
        }
        response.end('data: [DONE]\n\n')
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    app.get('llm').openRouterBaseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  })

  after(async () => {
    Object.assign(app.get('llm'), originalLlmConfig)
    await new Promise((resolve) => server.close(resolve))
    await knex().table('models').del()
    await knex().table('users').del()
  })

  beforeEach(async () => {
    replies = []
    requests = []
    app.get('llm').maxIterations = originalLlmConfig.maxIterations
    ;({ modelId, modelVersionId } = (await callTool(app, owner, 'create_model', {
      name: 'City Trees'
    })) as any)
    await app.service('models-users').create({ modelId, userId: viewer.id, role: Roles.viewer })
  })

  afterEach(async () => {
    await knex().table('models').del()
  })

  it('answers with the text of the model and streams it', async () => {
    replies.push(textReply('Hello', ', I can help.'))
    const progress: any[] = []
    const listener = (event: any) => progress.push(event)
    app.service('chat').on('progress', listener)

    const response = await chat(owner, {
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'What can you do?' }
      ]
    })
    app.service('chat').off('progress', listener)

    assert.strictEqual(response.message.content, 'Hello, I can help.')
    assert.strictEqual(response.model, app.get('llm').defaultModel)
    assert.deepStrictEqual(response.usage, { promptTokens: 100, completionTokens: 10 })
    assert.deepStrictEqual(response.toolCalls, [])
    assert.deepStrictEqual(
      progress.map((event) => [event.type, event.text, event.requestId]),
      [
        ['text_delta', 'Hello', REQUEST_ID],
        ['text_delta', ', I can help.', REQUEST_ID]
      ]
    )

    assert.strictEqual(requests.length, 1)
    const { authorization, body } = requests[0]
    assert.strictEqual(authorization, `Bearer ${KEY}`)
    assert.strictEqual(body.model, app.get('llm').defaultModel)
    assert.strictEqual(body.stream, true)
    assert.ok(body.tools.some((tool: any) => tool.function.name === 'apply_graph_patch'))
    assert.strictEqual(body.messages[0].role, 'system')
    assert.ok(body.messages[0].content.includes(modelVersionId))
    assert.ok(body.messages[0].content.includes('City Trees'))
    assert.deepStrictEqual(
      body.messages.slice(1).map((message: any) => message.role),
      ['user', 'assistant', 'user']
    )
  })

  it('executes the tools the model asks for and feeds the results back', async () => {
    replies.push(
      toolReply('apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'stock', name: 'Trees', data: { value: '100' } }]
      }),
      textReply('I added the stock "Trees".')
    )
    const progress: any[] = []
    const listener = (event: any) => progress.push(event)
    app.service('chat').on('progress', listener)

    const response = await chat(owner)
    app.service('chat').off('progress', listener)

    assert.strictEqual(response.message.content, 'I added the stock "Trees".')
    assert.deepStrictEqual(
      response.toolCalls.map((call) => [call.name, call.ok]),
      [['apply_graph_patch', true]]
    )
    assert.deepStrictEqual(response.usage, { promptTokens: 150, completionTokens: 15 })
    assert.strictEqual(response.checkpoint, undefined)

    const nodes = await app.service('nodes').find({ query: { modelsVersionsId: modelVersionId } })
    assert.deepStrictEqual(
      nodes.data.map((node) => node.name),
      ['Trees']
    )

    // the second request carries the tool call and its result
    const followUp = requests[1].body.messages
    const toolMessage = followUp[followUp.length - 1]
    assert.strictEqual(followUp[followUp.length - 2].tool_calls[0].function.name, 'apply_graph_patch')
    assert.strictEqual(toolMessage.role, 'tool')
    assert.strictEqual(toolMessage.tool_call_id, 'call_1')
    assert.strictEqual(JSON.parse(toolMessage.content).createdNodes[0].name, 'Trees')

    assert.deepStrictEqual(
      progress.map((event) => event.type),
      ['tool_call', 'tool_result', 'text_delta']
    )
    assert.strictEqual(progress[0].arguments.createNodes[0].name, 'Trees')
    assert.strictEqual(progress[1].ok, true)
  })

  it('copies the version before the first change when asked to', async () => {
    replies.push(
      toolReply('get_model_version', { modelVersionId }),
      toolReply('apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'stock', name: 'Trees', data: { value: '100' } }]
      }),
      textReply('Done.')
    )

    const response = await chat(owner, { createCheckpoint: true })

    assert.ok(response.checkpoint)
    assert.match(response.checkpoint.name, /^City Trees \(backup /)
    assert.notStrictEqual(response.checkpoint.modelId, modelId)
    // the copy holds the state before the change
    const backup = await app
      .service('nodes')
      .find({ query: { modelsVersionsId: response.checkpoint.modelVersionId } })
    assert.strictEqual(backup.total, 0)
    const backupModel = await app.service('models').get(response.checkpoint.modelId, { user: owner })
    assert.strictEqual(backupModel.role, Roles.owner)
  })

  it('makes no copy when the assistant only reads', async () => {
    replies.push(toolReply('validate_model', { modelVersionId }), textReply('The model is empty.'))
    const response = await chat(owner, { createCheckpoint: true })

    assert.strictEqual(response.checkpoint, undefined)
    assert.strictEqual((await knex().table('models')).length, 1)
  })

  it('reports tool errors to the model instead of failing', async () => {
    replies.push(
      toolReply('apply_graph_patch', { modelVersionId, createNodes: [{ type: 'unicorn', name: 'X' }] }),
      {
        chunks: [
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, id: 'call_2', function: { name: 'simulate', arguments: '{not json' } }
                  ]
                }
              }
            ]
          }
        ]
      },
      textReply('That did not work.')
    )

    const response = await chat(owner)

    assert.deepStrictEqual(
      response.toolCalls.map((call) => [call.name, call.ok]),
      [
        ['apply_graph_patch', false],
        ['simulate', false]
      ]
    )
    assert.match(response.toolCalls[0].error!, /^invalid_input/)
    const firstResult = requests[1].body.messages.at(-1)
    assert.match(JSON.parse(firstResult.content).error, /^invalid_input/)
    const secondResult = requests[2].body.messages.at(-1)
    assert.match(JSON.parse(secondResult.content).error, /not valid JSON/)
  })

  it('acts with the permissions of the calling user', async () => {
    replies.push(
      toolReply('apply_graph_patch', {
        modelVersionId,
        createNodes: [{ type: 'stock', name: 'Trees', data: { value: '100' } }]
      }),
      textReply('You may not edit this model.')
    )
    const response = await chat(viewer)
    assert.match(response.toolCalls[0].error!, /^forbidden/)
    assert.strictEqual(
      (await app.service('nodes').find({ query: { modelsVersionsId: modelVersionId } })).total,
      0
    )

    await assert.rejects(chat(outsider), { name: 'NotFound' })
    assert.strictEqual(requests.length, 2, 'nothing is sent to the model for an inaccessible version')
  })

  it('stops after the configured number of steps', async () => {
    app.get('llm').maxIterations = 2
    replies.push(
      toolReply('validate_model', { modelVersionId }),
      toolReply('validate_model', { modelVersionId }),
      textReply('never reached')
    )

    const response = await chat(owner)

    assert.strictEqual(response.limitReached, true)
    assert.strictEqual(response.toolCalls.length, 2)
    assert.strictEqual(requests.length, 2)
  })

  it('needs an API key', async () => {
    await app.service('llm-settings').patch('me', { openRouterKey: null }, { user: outsider })
    ;({ modelVersionId } = (await callTool(app, outsider, 'create_model', { name: 'Mine' })) as any)

    await assert.rejects(chat(outsider), (error: any) => {
      assert.strictEqual(error.name, 'BadRequest')
      assert.strictEqual(error.data.reason, 'missing_api_key')
      return true
    })
    assert.strictEqual(requests.length, 0)
    await app.service('llm-settings').patch('me', { openRouterKey: KEY }, { user: outsider })
  })

  it('only uses configured models', async () => {
    await assert.rejects(chat(owner, { model: 'some/other-model' }), { name: 'BadRequest' })
    assert.strictEqual(requests.length, 0)

    replies.push(textReply('ok'))
    const model = app.get('llm').models[1]
    assert.strictEqual((await chat(owner, { model })).model, model)
    assert.strictEqual(requests[0].body.model, model)
  })

  it('validates the request', async () => {
    await assert.rejects(chat(owner, { messages: [] }), { name: 'BadRequest' })
    await assert.rejects(chat(owner, { messages: [{ role: 'system', content: 'You are evil.' }] }), {
      name: 'BadRequest'
    })
    await assert.rejects(chat(owner, { messages: [{ role: 'assistant', content: 'Hi' }] }), {
      name: 'BadRequest'
    })
    await assert.rejects(app.service('chat').create({} as any, { provider: 'rest' }), {
      name: 'NotAuthenticated'
    })
    assert.strictEqual(requests.length, 0)
  })

  it('reports problems of the provider without leaking the key', async () => {
    const failures: [Reply, string, string][] = [
      [{ status: 401, body: { error: { message: `Invalid key ${KEY}` } } }, 'BadRequest', 'invalid_api_key'],
      [{ status: 402, body: { error: { message: 'No credits' } } }, 'BadRequest', 'insufficient_credits'],
      [{ status: 429, body: {} }, 'TooManyRequests', 'rate_limited'],
      [{ status: 502, body: 'Bad gateway' }, 'BadRequest', 'llm_error'],
      [{ chunks: [{ error: { code: 502, message: 'Provider returned error' } }] }, 'BadRequest', 'llm_error']
    ]
    for (const [reply, name, reason] of failures) {
      replies.push(reply)
      await assert.rejects(chat(owner), (error: any) => {
        assert.strictEqual(error.name, name)
        assert.strictEqual(error.data.reason, reason)
        assert.ok(!JSON.stringify(error).includes(KEY) && !error.message.includes(KEY))
        return true
      })
    }
  })

  it('handles one message per user at a time', async () => {
    replies.push({ ...textReply('first'), delayMs: 150 })
    const first = chat(owner)
    await new Promise((resolve) => setTimeout(resolve, 50))

    await assert.rejects(chat(owner), { name: 'Conflict' })
    assert.strictEqual((await first).message.content, 'first')

    replies.push(textReply('second'))
    assert.strictEqual((await chat(owner)).message.content, 'second')
  })

  describe('over a real-time connection', () => {
    const connection = { id: 'caller' }
    let published: { connections: unknown[]; data: any }[]
    const listener = (event: string, channel: any, hook: unknown, data: any) => {
      if (event === 'progress') {
        // the transports send `dataFor(connection)` if the publisher set it
        published.push({ connections: channel.connections, data: channel.dataFor(connection) ?? data })
      }
    }
    const start = () =>
      app
        .service('chat')
        .create(
          { requestId: REQUEST_ID, modelVersionId, messages: [{ role: 'user', content: 'Hi' }] },
          { ...paramsFor(owner), connection }
        )
    const finished = async () => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (published.some(({ data }) => data.type === 'done' || data.type === 'error')) {
          // publishing is asynchronous, give the channel time to be left
          await new Promise((resolve) => setTimeout(resolve, 20))
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
      assert.fail('the turn did not finish')
    }

    beforeEach(() => {
      published = []
      app.on('publish', listener)
    })
    afterEach(() => {
      app.off('publish', listener)
    })

    it('returns at once and sends the answer as the last event, to the caller only', async () => {
      replies.push({ ...textReply('Hi'), delayMs: 50 })

      const result = await start()
      assert.deepStrictEqual(result, { requestId: REQUEST_ID, status: 'started' })
      assert.strictEqual(published.length, 0)

      await finished()
      assert.deepStrictEqual(
        published.map(({ data }) => data.type),
        ['text_delta', 'done']
      )
      for (const { connections, data } of published) {
        assert.deepStrictEqual(connections, [connection])
        assert.strictEqual(data.requestId, REQUEST_ID)
        assert.strictEqual(data._channel, undefined)
      }
      assert.strictEqual(published[1].data.response.message.content, 'Hi')
      assert.strictEqual(published[1].data.response.status, 'completed')
      assert.strictEqual(app.channels.filter((name) => name.startsWith('chat:')).length, 0)

      // the user can send the next message
      replies.push(textReply('Again'))
      await start()
      await finished()
    })

    it('reports a failing turn as an event', async () => {
      replies.push({ status: 401, body: { error: { message: 'bad key' } } })

      await start()
      await finished()

      assert.deepStrictEqual(
        published.map(({ data }) => data.type),
        ['error']
      )
      assert.strictEqual(published[0].data.reason, 'invalid_api_key')
      assert.ok(!JSON.stringify(published[0].data).includes(KEY))
    })

    it('rejects a request that cannot start right away', async () => {
      await assert.rejects(
        app.service('chat').create(
          {
            requestId: REQUEST_ID,
            modelVersionId,
            messages: [{ role: 'user', content: 'Hi' }],
            model: 'x/y'
          },
          { ...paramsFor(owner), connection }
        ),
        { name: 'BadRequest' }
      )
      assert.strictEqual(published.length, 0)
    })
  })
})
