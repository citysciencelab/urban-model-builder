// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  processesQueryValidator,
  processesResolver,
  processesExternalResolver,
  processesQueryResolver
} from './processes.schema.js'

import type { Application } from '../../../declarations.js'
import { ProcessesService, getOptions } from './processes.class.js'
import { processesPath, processesMethods } from './processes.shared.js'

export * from './processes.class.js'
export * from './processes.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const processes = (app: Application) => {
  // Register our service on the Feathers application
  app.use(processesPath, new ProcessesService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: processesMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(processesPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(processesExternalResolver),
        schemaHooks.resolveResult(processesResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(processesQueryValidator),
        schemaHooks.resolveQuery(processesQueryResolver)
      ],
      find: [],
      get: [],
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
declare module '../../../declarations.js' {
  interface ServiceTypes {
    [processesPath]: ProcessesService
  }
}
