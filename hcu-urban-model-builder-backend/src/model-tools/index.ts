import { Ajv, addFormats } from '@feathersjs/schema'
import type { ValidateFunction } from 'ajv'
import type { Application } from '../declarations.js'
import { logger } from '../logger.js'
import type { User } from '../services/users/users.js'
import { consumeRateLimit } from '../utils/rate-limiter.js'
import { recordToolCall } from './audit-log.js'
import { tools } from './tools.js'
import { ToolError, type ToolDefinition, type ToolErrorCode, type ToolSource } from './types.js'

export { ToolError } from './types.js'
export type { ToolContext, ToolDefinition, ToolErrorCode, ToolSource } from './types.js'

/**
 * The tool layer: everything a language model can do with the Urban Model Builder, independent of how it is
 * connected. The MCP endpoint and the in-app chat are thin front ends over `listTools` and `callTool`.
 */

const toolsByName = new Map(tools.map((tool) => [tool.name, tool]))

// `useDefaults` fills in the defaults documented in the schemas
const ajv = addFormats(new Ajv({ useDefaults: true, allErrors: true }), ['uuid', 'date-time'])
const validators = new Map<string, ValidateFunction>()

function getValidator(tool: ToolDefinition) {
  let validator = validators.get(tool.name)
  if (!validator) {
    validator = ajv.compile(tool.inputSchema)
    validators.set(tool.name, validator)
  }
  return validator
}

/** The tools as a front end needs them to advertise them: name, description and JSON Schema of the input. */
export function listTools() {
  return tools.map(({ name, description, inputSchema, readOnly }) => ({
    name,
    description,
    inputSchema,
    readOnly
  }))
}

const CODE_BY_HTTP_STATUS: Record<number, ToolErrorCode> = {
  400: 'invalid_input',
  401: 'forbidden',
  403: 'forbidden',
  404: 'not_found',
  405: 'forbidden',
  409: 'conflict',
  422: 'invalid_input'
}

async function checkRateLimits(app: Application, user: User, tool: ToolDefinition) {
  const limits = app.get('limits')
  const checks: [string, number][] = [['tool-calls', limits.toolCallsPerMinute]]
  if (tool.name === 'simulate') {
    checks.push(['simulations', limits.simulationsPerMinute])
  }
  for (const [name, limit] of checks) {
    const { allowed, retryAfterSeconds } = await consumeRateLimit(app, name, user.id, limit, 60)
    if (!allowed) {
      throw new ToolError(
        'rate_limited',
        `Too many requests. Wait ${retryAfterSeconds} seconds before the next call.`,
        { retryAfterSeconds }
      )
    }
  }
}

/** Validates the input, runs the tool and turns every failure into a `ToolError`. */
async function runTool(
  app: Application,
  user: User,
  tool: ToolDefinition,
  input: unknown,
  source: ToolSource
) {
  await checkRateLimits(app, user, tool)

  // validation fills in defaults, which must not change the caller's object
  const validatedInput = structuredClone(input ?? {})
  const validate = getValidator(tool)
  if (!validate(validatedInput)) {
    const problems = (validate.errors ?? []).map(
      (error) =>
        `${error.instancePath || 'input'} ${error.message}${
          error.params && 'additionalProperty' in error.params
            ? ` ("${error.params.additionalProperty}")`
            : ''
        }`
    )
    throw new ToolError('invalid_input', `Invalid input for ${tool.name}:\n- ${problems.join('\n- ')}`, {
      problems
    })
  }

  try {
    return await tool.handler({ app, user, source }, validatedInput)
  } catch (error: any) {
    if (error instanceof ToolError) {
      throw error
    }
    const code = CODE_BY_HTTP_STATUS[error?.code]
    if (code) {
      // errors of the services (permissions, validation) are meant for clients and safe to pass on
      throw new ToolError(code, error.message, error.data)
    }
    logger.error(`Tool ${tool.name} failed unexpectedly`, error)
    throw new ToolError('internal', `The tool ${tool.name} failed unexpectedly.`)
  }
}

/**
 * Runs a tool on behalf of a user. Every failure is a `ToolError`: its message is written for the language
 * model, and nothing about the server's internals leaks through it. Every call is rate limited and recorded
 * in the tool call log.
 */
export async function callTool(
  app: Application,
  user: User,
  name: string,
  input: unknown = {},
  options: { source?: ToolSource } = {}
) {
  const tool = toolsByName.get(name)
  if (!tool) {
    throw new ToolError('unknown_tool', `There is no tool named "${name}".`)
  }
  const source = options.source ?? 'internal'
  const startedAt = performance.now()
  let errorCode: ToolErrorCode | undefined

  try {
    return await runTool(app, user, tool, input, source)
  } catch (error) {
    errorCode = error instanceof ToolError ? error.code : 'internal'
    throw error
  } finally {
    await recordToolCall(app, {
      userId: user.id,
      source,
      tool: tool.name,
      input,
      ok: errorCode === undefined,
      errorCode,
      durationMs: performance.now() - startedAt
    })
  }
}
