import { Type, getValidator, defaultAppConfiguration } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import { dataValidator } from './validators.js'

export const configurationSchema = Type.Intersect([
  defaultAppConfiguration,
  Type.Object({
    host: Type.String(),
    port: Type.Number(),
    public: Type.String(),
    // Geodata services (OGC API Features) the server itself may request data from, on behalf of the tools
    ogc: Type.Object({
      /** Hosts, with port if it is not the default one, e.g. "api.hamburg.de". */
      allowedHosts: Type.Array(Type.String())
    }),
    // Limits that protect the server from a runaway or abusive assistant
    limits: Type.Object({
      toolCallsPerMinute: Type.Number({ minimum: 1 }),
      simulationsPerMinute: Type.Number({ minimum: 1 }),
      chatTurnsPerHour: Type.Number({ minimum: 1 }),
      /** A simulation started by a tool is stopped after this time. */
      simulationTimeoutSeconds: Type.Number({ minimum: 1 }),
      maxConcurrentSimulations: Type.Number({ minimum: 1 }),
      /** How long the in-app chat waits for the user's browser to return a simulation. */
      browserSimulationTimeoutSeconds: Type.Number({ minimum: 1 }),
      /** Entries of the tool call log are deleted after this many days. */
      auditLogRetentionDays: Type.Number({ minimum: 1 })
    }),
    // The MCP endpoint for external AI assistants
    mcp: Type.Object({
      /** The URL under which clients reach the MCP endpoint, e.g. https://api.example.org/mcp. */
      publicUrl: Type.String({ format: 'uri' }),
      oauth: Type.Object({
        /** Accept OAuth access tokens of the OIDC issuer in addition to personal access tokens. */
        enabled: Type.Boolean(),
        /** The client scope of the authorization server that adds `publicUrl` as audience to a token. */
        scope: Type.String()
      })
    }),
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
