import type { Application } from '../declarations.js'
import { logger } from '../logger.js'
import type { ToolErrorCode, ToolSource } from './types.js'

/**
 * The log of tool calls: who let a language model do what, to which model, and whether it worked.
 *
 * It answers "what changed my model?" after the fact, which matters because changes of an assistant look
 * like changes of the user everywhere else. It records that a tool was called, not with which arguments:
 * arguments contain model content, which does not belong into a log.
 */

const TABLE = 'tool_calls'
const DAY_MS = 24 * 60 * 60 * 1000
// old entries are removed now and then while new ones are written
const PRUNE_PROBABILITY = 0.01

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const uuidOrNull = (value: unknown) => (typeof value === 'string' && UUID.test(value) ? value : null)

export async function recordToolCall(
  app: Application,
  call: {
    userId: string
    source: ToolSource
    tool: string
    input: unknown
    ok: boolean
    errorCode?: ToolErrorCode
    durationMs: number
  }
) {
  const input = (call.input && typeof call.input === 'object' ? call.input : {}) as Record<string, unknown>
  try {
    const knex = app.get('postgresqlClient')
    await knex(TABLE).insert({
      userId: call.userId,
      source: call.source,
      tool: call.tool,
      modelId: uuidOrNull(input.modelId),
      modelVersionId: uuidOrNull(input.modelVersionId),
      ok: call.ok,
      errorCode: call.errorCode ?? null,
      durationMs: Math.round(call.durationMs)
    })
    if (Math.random() < PRUNE_PROBABILITY) {
      await pruneToolCalls(app)
    }
  } catch (error) {
    // the log must never be the reason a tool fails
    logger.error('Could not record a tool call', error)
  }
}

/** Deletes the entries that are older than the configured retention. */
export async function pruneToolCalls(app: Application) {
  const retentionDays = app.get('limits').auditLogRetentionDays
  return app
    .get('postgresqlClient')(TABLE)
    .where('createdAt', '<', new Date(Date.now() - retentionDays * DAY_MS))
    .del()
}
