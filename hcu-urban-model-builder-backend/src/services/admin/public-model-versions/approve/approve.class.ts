// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { NullableId, Params } from '@feathersjs/feathers'

import type { Application } from '../../../../declarations.js'
import type {
  AdminPublicModelVersionsApprove,
  AdminPublicModelVersionsApprovePatch,
  AdminPublicModelVersionsApproveQuery
} from './approve.schema.js'
import { BadRequest } from '@feathersjs/errors'

export type {
  AdminPublicModelVersionsApprove,
  AdminPublicModelVersionsApprovePatch,
  AdminPublicModelVersionsApproveQuery
}

export interface AdminPublicModelVersionsApproveServiceOptions {
  app: Application
}

export interface AdminPublicModelVersionsApproveParams extends Params<AdminPublicModelVersionsApproveQuery> {}

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class AdminPublicModelVersionsApproveService {
  app: Application

  constructor(public options: AdminPublicModelVersionsApproveServiceOptions) {
    this.app = options.app
  }

  async patch(
    id: NullableId,
    _data: AdminPublicModelVersionsApprovePatch,
    params?: AdminPublicModelVersionsApproveParams
  ) {
    if (id == null) {
      throw new BadRequest('Not allowed to approve multiple models at once')
    }

    return this.app.service('models-versions').patch(id, {
      publishedToUMPApprovedAt: new Date().toISOString()
    })
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
