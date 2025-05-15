// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../../../client.js'
import type {
  AdminPublicModelVersionsUnapprove,
  AdminPublicModelVersionsUnapprovePatch,
  AdminPublicModelVersionsUnapproveQuery,
  AdminPublicModelVersionsUnapproveService
} from './unapprove.class.js'

export type {
  AdminPublicModelVersionsUnapprove,
  AdminPublicModelVersionsUnapprovePatch,
  AdminPublicModelVersionsUnapproveQuery
}

export type AdminPublicModelVersionsUnapproveClientService = Pick<
  AdminPublicModelVersionsUnapproveService,
  (typeof adminPublicModelVersionsUnapproveMethods)[number]
>

export const adminPublicModelVersionsUnapprovePath = 'admin/public-model-versions/unapprove'

export const adminPublicModelVersionsUnapproveMethods: Array<keyof AdminPublicModelVersionsUnapproveService> =
  ['patch']

export const adminPublicModelVersionsUnapproveClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(
    adminPublicModelVersionsUnapprovePath,
    connection.service(adminPublicModelVersionsUnapprovePath),
    {
      methods: adminPublicModelVersionsUnapproveMethods
    }
  )
}

// Add this service to the client service type index
declare module '../../../../client.js' {
  interface ServiceTypes {
    [adminPublicModelVersionsUnapprovePath]: AdminPublicModelVersionsUnapproveClientService
  }
}
