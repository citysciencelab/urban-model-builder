// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import {
  simulationResultsSchema,
  type SimulationResults,
  type SimulationResultsData,
  type SimulationResultsPatch,
  type SimulationResultsQuery,
} from './simulation-results.schema.js'

export type { SimulationResults, SimulationResultsData, SimulationResultsPatch, SimulationResultsQuery }

export interface SimulationResultsParams extends Params {
  // Add any custom parameters here
}

export interface SimulationResultsServiceOptions extends KnexAdapterOptions {
  app: Application
}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class SimulationResultsService<ServiceParams extends Params = SimulationResultsParams> extends KnexService<
  SimulationResults,
  SimulationResultsData,
  ServiceParams,
  SimulationResultsPatch
> {
  declare options: SimulationResultsServiceOptions

  get app(): Application {
    return this.options.app
  }
}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'simulation-results'
  }
}
