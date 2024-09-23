// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type {
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsPatch,
  ModelsVersionsQuery
} from './models-versions.schema.js'

export type { ModelsVersions, ModelsVersionsData, ModelsVersionsPatch, ModelsVersionsQuery }

export interface ModelsVersionsParams extends KnexAdapterParams<ModelsVersionsQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ModelsVersionsService<ServiceParams extends Params = ModelsVersionsParams> extends KnexService<
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsParams,
  ModelsVersionsPatch
> {}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'models_versions'
  }
}
