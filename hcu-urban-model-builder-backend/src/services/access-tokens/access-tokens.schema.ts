// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { AccessTokensService } from './access-tokens.class.js'
import { Nullable } from '../../utils/schema.js'

export const ACCESS_TOKEN_DEFAULT_LIFETIME_DAYS = 90
export const ACCESS_TOKEN_MAX_LIFETIME_DAYS = 365

// Main data model schema
export const accessTokensSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
    name: Type.String({ minLength: 1, maxLength: 255 }),
    tokenHash: Type.Optional(Type.String()),
    tokenPrefix: Type.String(),
    expiresAt: Type.String({ format: 'date-time' }),
    lastUsedAt: Nullable(Type.String({ format: 'date-time' })),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Nullable(Type.String({ format: 'date-time' })),
    // only present in the result of `create`
    token: Type.Optional(Type.String())
  },
  { $id: 'AccessTokens', additionalProperties: false }
)
export type AccessTokens = Static<typeof accessTokensSchema>
export const accessTokensValidator = getValidator(accessTokensSchema, dataValidator)
export const accessTokensResolver = resolve<AccessTokens, HookContext<AccessTokensService>>({
  // The hash never leaves the service, not even for internal calls. Tokens are verified in `token.ts`.
  tokenHash: async () => undefined
})

export const accessTokensExternalResolver = resolve<AccessTokens, HookContext<AccessTokensService>>({})

// Schema for creating new entries
export const accessTokensDataSchema = Type.Object(
  {
    name: accessTokensSchema.properties.name,
    expiresInDays: Type.Optional(Type.Integer({ minimum: 1, maximum: ACCESS_TOKEN_MAX_LIFETIME_DAYS }))
  },
  { $id: 'AccessTokensData', additionalProperties: false }
)
export type AccessTokensData = Static<typeof accessTokensDataSchema>
export const accessTokensDataValidator = getValidator(accessTokensDataSchema, dataValidator)
export const accessTokensDataResolver = resolve<AccessTokens, HookContext<AccessTokensService>>({})

// Schema for allowed query properties
export const accessTokensQueryProperties = Type.Pick(accessTokensSchema, [
  'id',
  'name',
  'createdAt',
  'expiresAt'
])
export const accessTokensQuerySchema = Type.Intersect(
  [querySyntax(accessTokensQueryProperties), Type.Object({}, { additionalProperties: false })],
  { additionalProperties: false }
)
export type AccessTokensQuery = Static<typeof accessTokensQuerySchema>
export const accessTokensQueryValidator = getValidator(accessTokensQuerySchema, queryValidator)
export const accessTokensQueryResolver = resolve<AccessTokensQuery, HookContext<AccessTokensService>>({})
