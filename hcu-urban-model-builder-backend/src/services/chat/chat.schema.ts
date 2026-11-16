// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { Type, getValidator } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import { dataValidator } from '../../validators.js'

// One turn of a conversation about a model version. The server keeps no history: the client sends the
// conversation so far with every request.
export const chatRequestSchema = Type.Object(
  {
    /** Chosen by the client, to match progress events with its request. */
    requestId: Type.String({ format: 'uuid' }),
    /** The model version the conversation is about, i.e. the one open in the editor. */
    modelVersionId: Type.String({ format: 'uuid' }),
    messages: Type.Array(
      Type.Object(
        {
          role: Type.Union([Type.Literal('user'), Type.Literal('assistant')]),
          content: Type.String({ maxLength: 20000 })
        },
        { additionalProperties: false }
      ),
      { minItems: 1, maxItems: 100 }
    ),
    /** One of the configured models; the user's preferred or the default model if omitted. */
    model: Type.Optional(Type.String()),
    /** Copy the model version before the assistant changes anything for the first time. */
    createCheckpoint: Type.Optional(Type.Boolean())
  },
  { $id: 'ChatRequest', additionalProperties: false }
)
export type ChatRequest = Static<typeof chatRequestSchema>
export const chatRequestValidator = getValidator(chatRequestSchema, dataValidator)

export const chatResponseSchema = Type.Object(
  {
    requestId: Type.String(),
    status: Type.Literal('completed'),
    model: Type.String(),
    message: Type.Object({ role: Type.Literal('assistant'), content: Type.String() }),
    toolCalls: Type.Array(
      Type.Object({
        name: Type.String(),
        arguments: Type.Unknown(),
        ok: Type.Boolean(),
        error: Type.Optional(Type.String())
      })
    ),
    /** True if the assistant was stopped because it needed too many steps. */
    limitReached: Type.Boolean(),
    usage: Type.Object({ promptTokens: Type.Number(), completionTokens: Type.Number() }),
    /** The backup copy that was made before the first change, if any. */
    checkpoint: Type.Optional(
      Type.Object({ modelId: Type.String(), modelVersionId: Type.String(), name: Type.String() })
    )
  },
  { $id: 'ChatResponse', additionalProperties: false }
)
export type ChatResponse = Static<typeof chatResponseSchema>

/** Result of `create` over a real-time connection: the answer follows as a progress event. */
export const chatStartedSchema = Type.Object(
  { requestId: Type.String(), status: Type.Literal('started') },
  { $id: 'ChatStarted', additionalProperties: false }
)
export type ChatStarted = Static<typeof chatStartedSchema>
