// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  scenariosDataValidator,
  scenariosPatchValidator,
  scenariosQueryValidator,
  scenariosResolver,
  scenariosExternalResolver,
  scenariosDataResolver,
  scenariosPatchResolver,
  scenariosQueryResolver
} from './scenarios.schema.js'

import type { Application } from '../../declarations.js'
import { ScenariosService, getOptions } from './scenarios.class.js'
import { scenariosPath, scenariosMethods } from './scenarios.shared.js'

export * from './scenarios.class.js'
export * from './scenarios.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const scenarios = (app: Application) => {
  // Register our service on the Feathers application
  app.use(scenariosPath, new ScenariosService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: scenariosMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(scenariosPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(scenariosExternalResolver),
        schemaHooks.resolveResult(scenariosResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(scenariosQueryValidator),
        schemaHooks.resolveQuery(scenariosQueryResolver)
      ],
      // FIXME: all permissions
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(scenariosDataValidator),
        schemaHooks.resolveData(scenariosDataResolver)
      ],
      patch: [
        schemaHooks.validateData(scenariosPatchValidator),
        schemaHooks.resolveData(scenariosPatchResolver)
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
    [scenariosPath]: ScenariosService
  }
}
