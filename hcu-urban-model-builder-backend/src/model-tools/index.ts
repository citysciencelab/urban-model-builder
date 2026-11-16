import { Ajv, addFormats } from '@feathersjs/schema'
import type { ValidateFunction } from 'ajv'
import type { Application } from '../declarations.js'
import { logger } from '../logger.js'
import type { User } from '../services/users/users.js'
import { tools } from './tools.js'
import { ToolError, type ToolDefinition, type ToolErrorCode } from './types.js'

export { ToolError } from './types.js'
export type { ToolContext, ToolDefinition, ToolErrorCode } from './types.js'

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

/**
 * Runs a tool on behalf of a user. Every failure is a `ToolError`: its message is written for the language
 * model, and nothing about the server's internals leaks through it.
 */
export async function callTool(app: Application, user: User, name: string, input: unknown = {}) {
  const tool = toolsByName.get(name)
  if (!tool) {
    throw new ToolError('unknown_tool', `There is no tool named "${name}".`)
  }

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
    throw new ToolError('invalid_input', `Invalid input for ${name}:\n- ${problems.join('\n- ')}`, {
      problems
    })
  }

  try {
    return await tool.handler({ app, user }, validatedInput)
  } catch (error: any) {
    if (error instanceof ToolError) {
      throw error
    }
    const code = CODE_BY_HTTP_STATUS[error?.code]
    if (code) {
      // errors of the services (permissions, validation) are meant for clients and safe to pass on
      throw new ToolError(code, error.message, error.data)
    }
    logger.error(`Tool ${name} failed unexpectedly`, error)
    throw new ToolError('internal', `The tool ${name} failed unexpectedly.`)
  }
}
