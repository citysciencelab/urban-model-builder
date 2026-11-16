import type { Static, TSchema } from '@feathersjs/typebox'
import type { Application } from '../declarations.js'
import type { User } from '../services/users/users.js'

/** Everything a tool needs to act: the app and the user on whose behalf it acts. */
export interface ToolContext {
  app: Application
  user: User
}

export interface ToolDefinition<S extends TSchema = TSchema> {
  name: string
  /** Written for the language model: what the tool does and when to use it. */
  description: string
  inputSchema: S
  /** True if the tool never changes data. Front ends can use this to skip confirmations. */
  readOnly: boolean
  handler: (ctx: ToolContext, input: Static<S>) => Promise<unknown>
}

export const defineTool = <S extends TSchema>(tool: ToolDefinition<S>): ToolDefinition<S> => tool

export type ToolErrorCode =
  | 'unknown_tool'
  | 'invalid_input'
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'simulation_failed'
  | 'internal'

/** An error whose message is meant to be shown to the language model so it can correct itself. */
export class ToolError extends Error {
  constructor(
    public code: ToolErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ToolError'
  }

  toJSON() {
    return { code: this.code, message: this.message, details: this.details }
  }
}
