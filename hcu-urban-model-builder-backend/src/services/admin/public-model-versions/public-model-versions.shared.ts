// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { ClientApplication } from '../../../client.js'
import type {
  AdminPublicModelVersions,
  AdminPublicModelVersionsQuery,
  AdminPublicModelVersionsService
} from './public-model-versions.class.js'

export type { AdminPublicModelVersions, AdminPublicModelVersionsQuery }

export type AdminPublicModelVersionsClientService = Pick<
  AdminPublicModelVersionsService,
  (typeof adminPublicModelVersionsMethods)[number]
>

export const adminPublicModelVersionsPath = 'admin/public-model-versions'

export const adminPublicModelVersionsMethods: Array<keyof AdminPublicModelVersionsService> = ['find']

export const adminPublicModelVersionsClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(adminPublicModelVersionsPath, connection.service(adminPublicModelVersionsPath), {
    methods: adminPublicModelVersionsMethods
  })
}

// Add this service to the client service type index
declare module '../../../client.js' {
  interface ServiceTypes {
    [adminPublicModelVersionsPath]: AdminPublicModelVersionsClientService
  }
}
