// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import {
  simulationResultsSchema,
  type SimulationResults,
  type SimulationResultsData,
  type SimulationResultsPatch,
  type SimulationResultsQuery,
} from './simulation-results.schema.js'

export type { SimulationResults, SimulationResultsData, SimulationResultsPatch, SimulationResultsQuery }

export interface SimulationResultsParams extends KnexAdapterParams<SimulationResultsQuery> {
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

  createQuery(params: KnexAdapterParams<SimulationResultsQuery>) {
    const query = super.createQuery(params as any)

    if (!params?.user?.id) {
      throw new Error(
        'SimulationResultsService:createQuery: params.user.id is required but not set. Probably missing authentication.'
      )
    }

    // Ensure createdBy is set on create
    if (params.query?.createdBy === undefined && params.method === 'create') {
      query.insert({ createdBy: params.user.id })
    }

    // Filter by user permissions - users can only see their own simulation results
    if (params.query?.createdBy === undefined && params.method === 'find') {
      query.where('simulation_results.createdBy', params.user.id)
    }

    // Join with models_versions and models to get additional info
    query.leftJoin('models_versions', 'simulation_results.modelsVersionsId', 'models_versions.id')
    query.leftJoin('models', 'models_versions.modelId', 'models.id')
    query.select('simulation_results.*', 'models_versions.majorVersion', 'models_versions.minorVersion', 'models_versions.draftVersion', 'models.internalName as modelName')

    return query
  }
}
