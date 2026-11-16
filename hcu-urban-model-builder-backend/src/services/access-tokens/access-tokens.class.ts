// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type { AccessTokens, AccessTokensData, AccessTokensQuery } from './access-tokens.schema.js'

export type { AccessTokens, AccessTokensData, AccessTokensQuery }

export interface AccessTokensParams extends KnexAdapterParams<AccessTokensQuery> {
  /** The token in plain text, passed from the before to the after hook of `create`. */
  plainToken?: string
}

/**
 * Personal access tokens: long-lived credentials a user creates for programs acting on their behalf, at
 * present the MCP endpoint. Tokens can be listed, created and revoked, but not changed.
 */
export class AccessTokensService<ServiceParams extends Params = AccessTokensParams> extends KnexService<
  AccessTokens,
  AccessTokensData,
  AccessTokensParams
> {}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'access_tokens'
  }
}
