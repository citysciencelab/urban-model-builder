// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Paginated, Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../../declarations.js'
import type {
  AdminPublicModelVersions,
  AdminPublicModelVersionsQuery
} from './public-model-versions.schema.js'
import { NotImplemented } from '@feathersjs/errors'

export type { AdminPublicModelVersions, AdminPublicModelVersionsQuery }

export interface AdminPublicModelVersionsServiceOptions {
  app: Application
}

export interface AdminPublicModelVersionsParams extends Params<AdminPublicModelVersionsQuery> {}

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class AdminPublicModelVersionsService {
  private app: Application

  constructor(public options: AdminPublicModelVersionsServiceOptions) {
    this.app = options.app
  }

  async find(params?: AdminPublicModelVersionsParams): Promise<Paginated<AdminPublicModelVersions>> {
    const query = params?.query || {}
    return this.app.service('models-versions').find({
      query: {
        publishedToUMPAt: {
          $ne: null
        },
        ...query
      }
    })
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
