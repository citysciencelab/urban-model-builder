// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type {
  AccessTokens,
  AccessTokensData,
  AccessTokensQuery,
  AccessTokensService
} from './access-tokens.class.js'

export type { AccessTokens, AccessTokensData, AccessTokensQuery }

export type AccessTokensClientService = Pick<
  AccessTokensService<Params<AccessTokensQuery>>,
  (typeof accessTokensMethods)[number]
>

export const accessTokensPath = 'access-tokens'

export const accessTokensMethods: Array<keyof AccessTokensService> = ['find', 'create', 'remove']

export const accessTokensClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(accessTokensPath, connection.service(accessTokensPath), {
    methods: accessTokensMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [accessTokensPath]: AccessTokensClientService
  }
}
