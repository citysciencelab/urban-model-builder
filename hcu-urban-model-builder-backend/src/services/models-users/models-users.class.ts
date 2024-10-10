// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type {
  ModelsUsers,
  ModelsUsersData,
  ModelsUsersPatch,
  ModelsUsersQuery
} from './models-users.schema.js'

export type { ModelsUsers, ModelsUsersData, ModelsUsersPatch, ModelsUsersQuery }

export interface ModelsUsersParams extends KnexAdapterParams<ModelsUsersQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ModelsUsersService<ServiceParams extends Params = ModelsUsersParams> extends KnexService<
  ModelsUsers,
  ModelsUsersData,
  ModelsUsersParams,
  ModelsUsersPatch
> {}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'models_users'
  }
}
