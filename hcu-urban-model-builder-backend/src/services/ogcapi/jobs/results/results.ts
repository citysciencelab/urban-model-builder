// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from '../../../../declarations.js'
import { JobResultsService, getOptions } from './results.class.js'
import { resultsPath, resultsMethods } from './results.shared.js'

export * from './results.class.js'

// A configure function that registers the service and its hooks via `app.configure`
export const jobResults = (app: Application) => {
  // Register our service on the Feathers application
  app.use(resultsPath, new JobResultsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: resultsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(resultsPath).hooks({
    around: {
      all: []
    },
    before: {
      all: [],
      find: []
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
    [resultsPath]: JobResultsService
  }
}
