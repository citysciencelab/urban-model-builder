// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { Type, getValidator } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import { dataValidator } from '../../validators.js'
import { Nullable } from '../../utils/schema.js'

// What a user sees of their settings. The API key itself is write-only.
export const llmSettingsSchema = Type.Object(
  {
    /** False if the server cannot store keys; the chat is then unavailable for everyone. */
    chatAvailable: Type.Boolean(),
    hasOpenRouterKey: Type.Boolean(),
    openRouterKeyHint: Nullable(Type.String()),
    /** The model the user chose, null for the default. */
    model: Nullable(Type.String()),
    defaultModel: Type.String(),
    availableModels: Type.Array(Type.String())
  },
  { $id: 'LlmSettings', additionalProperties: false }
)
export type LlmSettings = Static<typeof llmSettingsSchema>

export const llmSettingsPatchSchema = Type.Object(
  {
    // null removes the key
    openRouterKey: Type.Optional(Type.Union([Type.Null(), Type.String({ minLength: 20, maxLength: 500 })])),
    // null selects the default model
    model: Type.Optional(Type.Union([Type.Null(), Type.String({ maxLength: 255 })]))
  },
  { $id: 'LlmSettingsPatch', additionalProperties: false }
)
export type LlmSettingsPatch = Static<typeof llmSettingsPatchSchema>
export const llmSettingsPatchValidator = getValidator(llmSettingsPatchSchema, dataValidator)
