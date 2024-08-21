// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  edgesDataValidator,
  edgesPatchValidator,
  edgesQueryValidator,
  edgesResolver,
  edgesExternalResolver,
  edgesDataResolver,
  edgesPatchResolver,
  edgesQueryResolver
} from './edges.schema'

import type { Application } from '../../declarations'
import { EdgesService, getOptions } from './edges.class'
import { edgesPath, edgesMethods } from './edges.shared'

export * from './edges.class'
export * from './edges.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const edges = (app: Application) => {
  // Register our service on the Feathers application
  app.use(edgesPath, new EdgesService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: edgesMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(edgesPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(edgesExternalResolver), schemaHooks.resolveResult(edgesResolver)]
    },
    before: {
      all: [schemaHooks.validateQuery(edgesQueryValidator), schemaHooks.resolveQuery(edgesQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(edgesDataValidator), schemaHooks.resolveData(edgesDataResolver)],
      patch: [schemaHooks.validateData(edgesPatchValidator), schemaHooks.resolveData(edgesPatchResolver)],
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
declare module '../../declarations' {
  interface ServiceTypes {
    [edgesPath]: EdgesService
  }
}
