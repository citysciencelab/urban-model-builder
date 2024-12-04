// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from '../../../../declarations.js'
import { ProcessesExecutionService, getOptions } from './execution.class.js'
import { processesExecutionPath, processesExecutionMethods } from './execution.shared.js'

export * from './execution.class.js'

// A configure function that registers the service and its hooks via `app.configure`
export const processesExecution = (app: Application) => {
  // Register our service on the Feathers application
  app.use(processesExecutionPath, new ProcessesExecutionService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: processesExecutionMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(processesExecutionPath).hooks({
    around: {
      all: []
    },
    before: {
      all: [],
      create: []
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
declare module '../../../../declarations.js' {
  interface ServiceTypes {
    [processesExecutionPath]: ProcessesExecutionService
  }
}
