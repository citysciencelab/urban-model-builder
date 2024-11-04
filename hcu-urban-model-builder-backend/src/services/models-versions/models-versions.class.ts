// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Id, Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type {
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsPatch,
  ModelsVersionsQuery
} from './models-versions.schema.js'
import { AlgorithmType } from 'simulation'
import { isServerCall } from '../../utils/is-server-call.js'

export type { ModelsVersions, ModelsVersionsData, ModelsVersionsPatch, ModelsVersionsQuery }

export interface ModelsVersionsParams extends KnexAdapterParams<ModelsVersionsQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ModelsVersionsService<ServiceParams extends Params = ModelsVersionsParams> extends KnexService<
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsParams,
  ModelsVersionsPatch
> {
  createQuery(params: KnexAdapterParams<ModelsVersionsQuery>) {
    const query = super.createQuery(params as any)
    // ignore when isTouch is true, because then we only patch the updatedAt field, no need to join
    if (params.isTouch || (isServerCall(params) && !params?.user?.id)) {
      return query
    }

    if (!params?.user?.id) {
      throw new Error(
        'ModelsVersionsService:createQuery: params.user.id is required but not set. Probably missing authentication.'
      )
    }
    // join on models_users to get the role of the user
    query.leftJoin('models_users as models_users', function () {
      this.on('models_versions.modelId', '=', 'models_users.modelId').andOn(
        'models_users.userId',
        '=',
        params?.user?.id as unknown as any
      )
    })
    // join on models to get the model name
    query.leftJoin('models as models', 'models.id', 'models_versions.modelId')
    // select role as extra field
    query.select('models_users.role as role')
    return query
  }

  _get(id: Id, params?: ModelsVersionsParams | undefined) {
    return super._get(id, params)
  }
}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'models_versions'
  }
}
