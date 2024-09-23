// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type {
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsPatch,
  ModelsVersionsQuery,
  ModelsVersionsService
} from './models-versions.class.js'

export type { ModelsVersions, ModelsVersionsData, ModelsVersionsPatch, ModelsVersionsQuery }

export type ModelsVersionsClientService = Pick<
  ModelsVersionsService<Params<ModelsVersionsQuery>>,
  (typeof modelsVersionsMethods)[number]
>

export const modelsVersionsPath = 'models-versions'

export const modelsVersionsMethods: Array<keyof ModelsVersionsService> = [
  'find',
  'get',
  'create',
  'patch',
  'remove'
]

export const modelsVersionsClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(modelsVersionsPath, connection.service(modelsVersionsPath), {
    methods: modelsVersionsMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [modelsVersionsPath]: ModelsVersionsClientService
  }
}
