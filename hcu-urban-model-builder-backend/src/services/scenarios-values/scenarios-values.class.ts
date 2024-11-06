// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type {
  ScenarioValues,
  ScenarioValuesData,
  ScenarioValuesPatch,
  ScenarioValuesQuery
} from './scenarios-values.schema.js'

export type { ScenarioValues, ScenarioValuesData, ScenarioValuesPatch, ScenarioValuesQuery }

export interface ScenarioValuesParams extends KnexAdapterParams<ScenarioValuesQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ScenarioValuesService<ServiceParams extends Params = ScenarioValuesParams> extends KnexService<
  ScenarioValues,
  ScenarioValuesData,
  ScenarioValuesParams,
  ScenarioValuesPatch
> {}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'scenario_values'
  }
}
