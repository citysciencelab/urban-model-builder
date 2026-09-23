// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  simulationResultsDataValidator,
  simulationResultsPatchValidator,
  simulationResultsQueryValidator,
  simulationResultsResolver,
  simulationResultsExternalResolver,
  simulationResultsDataResolver,
  simulationResultsPatchResolver,
  simulationResultsQueryResolver
} from './simulation-results.schema.js'

import type { Application } from '../../declarations.js'
import { SimulationResultsService, getOptions } from './simulation-results.class.js'
import { simulationResultsPath, simulationResultsMethods } from './simulation-results.shared.js'

export * from './simulation-results.class.js'
export * from './simulation-results.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const simulationResults = (app: Application) => {
  // Register our service on the Feathers application
  app.use(simulationResultsPath, new SimulationResultsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: simulationResultsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(simulationResultsPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(simulationResultsExternalResolver),
        schemaHooks.resolveResult(simulationResultsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(simulationResultsQueryValidator),
        schemaHooks.resolveQuery(simulationResultsQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(simulationResultsDataValidator),
        schemaHooks.resolveData(simulationResultsDataResolver)
      ],
      patch: [
        schemaHooks.validateData(simulationResultsPatchValidator),
        schemaHooks.resolveData(simulationResultsPatchResolver)
      ],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations.js' {
  interface ServiceTypes {
    [simulationResultsPath]: SimulationResultsService
  }
}
