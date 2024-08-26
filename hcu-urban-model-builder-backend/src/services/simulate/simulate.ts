// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  simulateDataValidator,
  simulatePatchValidator,
  simulateQueryValidator,
  simulateResolver,
  simulateExternalResolver,
  simulateDataResolver,
  simulatePatchResolver,
  simulateQueryResolver
} from './simulate.schema.js'

import type { Application } from '../../declarations.js'
import { SimulateService, getOptions } from './simulate.class.js'
import { simulatePath, simulateMethods } from './simulate.shared.js'

export * from './simulate.class.js'
export * from './simulate.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const simulate = (app: Application) => {
  // Register our service on the Feathers application
  app.use(simulatePath, new SimulateService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: simulateMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(simulatePath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(simulateExternalResolver),
        schemaHooks.resolveResult(simulateResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(simulateQueryValidator),
        schemaHooks.resolveQuery(simulateQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(simulateDataValidator),
        schemaHooks.resolveData(simulateDataResolver)
      ],
      patch: [
        schemaHooks.validateData(simulatePatchValidator),
        schemaHooks.resolveData(simulatePatchResolver)
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
    [simulatePath]: SimulateService
  }
}
