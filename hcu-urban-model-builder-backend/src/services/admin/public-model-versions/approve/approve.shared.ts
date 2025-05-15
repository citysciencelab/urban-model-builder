// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../../../client.js'
import type {
  AdminPublicModelVersionsApprove,
  AdminPublicModelVersionsApprovePatch,
  AdminPublicModelVersionsApproveQuery,
  AdminPublicModelVersionsApproveService
} from './approve.class.js'

export type {
  AdminPublicModelVersionsApprove,
  AdminPublicModelVersionsApprovePatch,
  AdminPublicModelVersionsApproveQuery
}

export type AdminPublicModelVersionsApproveClientService = Pick<
  AdminPublicModelVersionsApproveService,
  (typeof adminPublicModelVersionsApproveMethods)[number]
>

export const adminPublicModelVersionsApprovePath = 'admin/public-model-versions/approve'

export const adminPublicModelVersionsApproveMethods: Array<keyof AdminPublicModelVersionsApproveService> = [
  'patch'
]

export const adminPublicModelVersionsApproveClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(adminPublicModelVersionsApprovePath, connection.service(adminPublicModelVersionsApprovePath), {
    methods: adminPublicModelVersionsApproveMethods
  })
}

// Add this service to the client service type index
declare module '../../../../client.js' {
  interface ServiceTypes {
    [adminPublicModelVersionsApprovePath]: AdminPublicModelVersionsApproveClientService
  }
}
