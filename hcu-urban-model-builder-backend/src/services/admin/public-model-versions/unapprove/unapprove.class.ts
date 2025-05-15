// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../../../declarations.js'
import type {
  AdminPublicModelVersionsUnapprove,
  AdminPublicModelVersionsUnapprovePatch,
  AdminPublicModelVersionsUnapproveQuery
} from './unapprove.schema.js'

export type {
  AdminPublicModelVersionsUnapprove,
  AdminPublicModelVersionsUnapprovePatch,
  AdminPublicModelVersionsUnapproveQuery
}

export interface AdminPublicModelVersionsUnapproveServiceOptions {
  app: Application
}

export interface AdminPublicModelVersionsUnapproveParams
  extends Params<AdminPublicModelVersionsUnapproveQuery> {}

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class AdminPublicModelVersionsUnapproveService {
  app: Application

  constructor(public options: AdminPublicModelVersionsUnapproveServiceOptions) {
    this.app = options.app
  }

  patch(
    id: string,
    _data: AdminPublicModelVersionsUnapprovePatch,
    params?: AdminPublicModelVersionsUnapproveParams
  ) {
    return this.app.service('models-versions').patch(id, {
      publishedToUMPApprovedAt: null
    })
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
