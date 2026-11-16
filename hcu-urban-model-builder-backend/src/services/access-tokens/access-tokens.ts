// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { hooks as schemaHooks } from '@feathersjs/schema'
import { BadRequest } from '@feathersjs/errors'
import _ from 'lodash'

import {
  ACCESS_TOKEN_DEFAULT_LIFETIME_DAYS,
  accessTokensDataResolver,
  accessTokensDataValidator,
  accessTokensExternalResolver,
  accessTokensQueryResolver,
  accessTokensQueryValidator,
  accessTokensResolver
} from './access-tokens.schema.js'

import type { Application, HookContext } from '../../declarations.js'
import { AccessTokensService, getOptions, type AccessTokens } from './access-tokens.class.js'
import { accessTokensPath, accessTokensMethods } from './access-tokens.shared.js'
import { ensureUserId } from '../../utils/ensure-user-id.js'
import { generateAccessToken } from './token.js'

export * from './access-tokens.class.js'
export * from './access-tokens.schema.js'

const MAX_TOKENS_PER_USER = 20
const DAY_MS = 24 * 60 * 60 * 1000

/** Users only ever see and remove their own tokens. */
const restrictToOwnTokens = (context: HookContext<AccessTokensService>) => {
  _.set(context, 'params.query.userId', ensureUserId(context))
}

/** Replaces the request of the user with the record to store; the token itself is kept for the result. */
const prepareToken = async (context: HookContext<AccessTokensService>) => {
  const userId = ensureUserId(context)
  const { name, expiresInDays } = context.data as { name: string; expiresInDays?: number }

  const [{ count }] = await context.app.get('postgresqlClient')('access_tokens').where({ userId }).count()
  if (Number(count) >= MAX_TOKENS_PER_USER) {
    throw new BadRequest(`You cannot have more than ${MAX_TOKENS_PER_USER} access tokens. Revoke one first.`)
  }

  const { token, tokenHash, tokenPrefix } = generateAccessToken()
  context.params.plainToken = token
  context.data = {
    name,
    userId,
    tokenHash,
    tokenPrefix,
    expiresAt: new Date(Date.now() + (expiresInDays ?? ACCESS_TOKEN_DEFAULT_LIFETIME_DAYS) * DAY_MS)
  } as any
}

const revealTokenOnce = (context: HookContext<AccessTokensService>) => {
  context.result = { ...(context.result as AccessTokens), token: context.params.plainToken }
}

// A configure function that registers the service and its hooks via `app.configure`
export const accessTokens = (app: Application) => {
  // Register our service on the Feathers application
  app.use(accessTokensPath, new AccessTokensService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: accessTokensMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(accessTokensPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(accessTokensExternalResolver),
        schemaHooks.resolveResult(accessTokensResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(accessTokensQueryValidator),
        schemaHooks.resolveQuery(accessTokensQueryResolver)
      ],
      find: [restrictToOwnTokens],
      create: [
        schemaHooks.validateData(accessTokensDataValidator),
        schemaHooks.resolveData(accessTokensDataResolver),
        prepareToken
      ],
      remove: [restrictToOwnTokens]
    },
    after: {
      create: [revealTokenOnce]
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations.js' {
  interface ServiceTypes {
    [accessTokensPath]: AccessTokensService
  }
}
