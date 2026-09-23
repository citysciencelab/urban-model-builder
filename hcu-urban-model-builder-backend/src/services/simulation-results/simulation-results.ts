// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  simulationResultsDataValidator,
  simulationResultsPatchValidator,
  simulationResultsQueryValidator,
  simulationResultsResolver,
  simulationResultsExternalResolver,
} from './simulation-results.schema.js'

import type { Application } from '../../declarations.js'
import { SimulationResultsService, getOptions } from './simulation-results.class.js'

export * from './simulation-results.class.js'
export * from './simulation-results.schema.js'

// A configure function that registers the service and its hooks via `app.configure()`
export const simulationResults = (app: Application) => {
  // Register our service on the Feathers application
  app.use('simulation-results', new SimulationResultsService(getOptions(app)), {
    // A list of hooks that are executed for every service method
    hooks: {
      around: {
        // resolve: [authenticate('jwt')],
      },
      before: {
        all: [
          authenticate('jwt'),
          schemaHooks.validateQuery(simulationResultsQueryValidator),
          schemaHooks.resolveQuery(simulationResultsQueryResolver),
        ],
        find: [],
        get: [],
        create: [
          schemaHooks.validateData(simulationResultsDataValidator),
          schemaHooks.resolveData(simulationResultsResolver),
        ],
        patch: [
          schemaHooks.validateData(simulationResultsPatchValidator),
          schemaHooks.resolveData(simulationResultsResolver),
        ],
        remove: [],
      },
      after: {
        all: [schemaHooks.resolveAll(simulationResultsExternalResolver)],
      },
      error: {
        all: [],
      },
    },
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    'simulation-results': SimulationResultsService
  }
}
