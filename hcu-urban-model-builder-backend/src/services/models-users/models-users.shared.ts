// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type {
  ModelsUsers,
  ModelsUsersData,
  ModelsUsersPatch,
  ModelsUsersQuery,
  ModelsUsersService
} from './models-users.class.js'

export type { ModelsUsers, ModelsUsersData, ModelsUsersPatch, ModelsUsersQuery }

export type ModelsUsersClientService = Pick<
  ModelsUsersService<Params<ModelsUsersQuery>>,
  (typeof modelsUsersMethods)[number]
>

export const modelsUsersPath = 'models-users'

export const modelsUsersMethods: Array<keyof ModelsUsersService> = [
  'find',
  'get',
  'create',
  'patch',
  'remove'
]

export const modelsUsersClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(modelsUsersPath, connection.service(modelsUsersPath), {
    methods: modelsUsersMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [modelsUsersPath]: ModelsUsersClientService
  }
}
