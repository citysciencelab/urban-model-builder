import { Type, getValidator, defaultAppConfiguration } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import { dataValidator } from './validators.js'

export const configurationSchema = Type.Intersect([
  defaultAppConfiguration,
  Type.Object({
    host: Type.String(),
    port: Type.Number(),
    public: Type.String(),
    // Language models for the in-app chat, reached through OpenRouter with the users' own API keys
    llm: Type.Object({
      /** Secret the users' API keys are encrypted with. Without it, keys cannot be stored and the chat is off. */
      encryptionSecret: Type.Optional(Type.String({ minLength: 16 })),
      openRouterBaseUrl: Type.String(),
      /** OpenRouter ids of the models users may choose from. */
      models: Type.Array(Type.String(), { minItems: 1 }),
      defaultModel: Type.String(),
      /** Upper limit of model calls for one chat message. */
      maxIterations: Type.Number({ minimum: 1 })
    })
  })
])

export type ApplicationConfiguration = Static<typeof configurationSchema>

export const configurationValidator = getValidator(configurationSchema, dataValidator)
