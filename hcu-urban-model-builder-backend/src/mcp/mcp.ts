import type { Middleware } from 'koa'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Application } from '../declarations.js'
import { logger } from '../logger.js'
import { callTool, listTools, ToolError } from '../model-tools/index.js'
import { resolveAccessToken } from '../services/access-tokens/token.js'
import type { User } from '../services/users/users.js'

export const MCP_PATH = '/mcp'

const INSTRUCTIONS = `Tools to read, build, edit and simulate models in the Urban Model Builder, a web application for system dynamics and agent-based models of urban systems.

Call get_modeling_reference once before building or changing a model. Only draft versions can be edited; apply_graph_patch takes all nodes and edges of a change in one call and arranges new nodes itself. After changing a model, check it with validate_model and simulate.`

/** A humanly readable title, e.g. "Apply graph patch" for apply_graph_patch. */
const toTitle = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')

/**
 * Builds an MCP server whose tools act on behalf of one user. The server is a thin adapter: which tools exist
 * and what they do is defined by the tool layer in `src/model-tools`.
 */
export function createMcpServer(app: Application, user: User) {
  const server = new Server(
    { name: 'urban-model-builder', title: 'Urban Model Builder', version: '1.0.0' },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listTools().map((tool) => ({
      name: tool.name,
      title: toTitle(tool.name),
      description: tool.description,
      inputSchema: tool.inputSchema as any,
      annotations: { readOnlyHint: tool.readOnly, openWorldHint: false }
    }))
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await callTool(app, user, request.params.name, request.params.arguments ?? {})
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    } catch (error) {
      if (error instanceof ToolError) {
        // reported as a tool result rather than a protocol error, so that the model sees it and can react
        const details = error.details === undefined ? '' : `\n${JSON.stringify(error.details)}`
        return {
          content: [{ type: 'text', text: `${error.code}: ${error.message}${details}` }],
          isError: true
        }
      }
      throw error
    }
  })

  return server
}

const getBearerToken = (header: string | undefined) => {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '')
  return match ? match[1] : null
}

/**
 * Koa middleware that serves the MCP endpoint (Streamable HTTP transport) at `MCP_PATH`.
 *
 * Callers authenticate with a personal access token. The endpoint is stateless: every request gets its own
 * server and transport, so it needs no session affinity and works behind a load balancer.
 */
export function mcpMiddleware(app: Application): Middleware {
  return async (ctx, next) => {
    if (ctx.path !== MCP_PATH) {
      return next()
    }

    const token = getBearerToken(ctx.get('authorization'))
    const user = token ? await resolveAccessToken(app, token) : null
    if (!user) {
      ctx.status = 401
      ctx.set('WWW-Authenticate', 'Bearer realm="Urban Model Builder"')
      ctx.body = {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'A valid personal access token is required.' },
        id: null
      }
      return
    }

    if (ctx.method !== 'POST') {
      // without sessions there is no stream to open (GET) and nothing to end (DELETE)
      ctx.status = 405
      ctx.set('Allow', 'POST')
      ctx.body = { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }
      return
    }

    const server = createMcpServer(app, user)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    })
    ctx.res.on('close', () => {
      transport.close().catch((error) => logger.error('Error closing the MCP transport', error))
      server.close().catch((error) => logger.error('Error closing the MCP server', error))
    })

    // the transport writes the response itself
    ctx.respond = false
    try {
      await server.connect(transport)
      await transport.handleRequest(ctx.req, ctx.res, ctx.request.body)
    } catch (error) {
      logger.error('Error handling an MCP request', error)
      if (!ctx.res.headersSent) {
        ctx.res.writeHead(500, { 'Content-Type': 'application/json' })
        ctx.res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error.' },
            id: null
          })
        )
      }
    }
  }
}
