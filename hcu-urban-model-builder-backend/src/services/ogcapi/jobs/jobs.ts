// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  jobsQueryValidator,
  jobsResolver,
  jobsExternalResolver,
  jobsQueryResolver
} from './jobs.schema.js'

import type { Application } from '../../../declarations.js'
import { JobsService, getOptions } from './jobs.class.js'
import { jobsPath, jobsMethods } from './jobs.shared.js'

export * from './jobs.class.js'
export * from './jobs.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const jobs = (app: Application) => {
  // Register our service on the Feathers application
  app.use(jobsPath, new JobsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: jobsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(jobsPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(jobsExternalResolver), schemaHooks.resolveResult(jobsResolver)]
    },
    before: {
      all: [schemaHooks.validateQuery(jobsQueryValidator), schemaHooks.resolveQuery(jobsQueryResolver)],
      find: [],
      get: [],
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
declare module '../../../declarations.js' {
  interface ServiceTypes {
    [jobsPath]: JobsService
  }
}
