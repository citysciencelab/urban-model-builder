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
} from './edges.schema.js'

import type { Application } from '../../declarations.js'
import { EdgesService, getOptions } from './edges.class.js'
import { edgesPath, edgesMethods } from './edges.shared.js'
import { touchParent } from '../../utils/touch-parent.js'

export * from './edges.class.js'
export * from './edges.schema.js'

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
declare module '../../declarations.js' {
  interface ServiceTypes {
    [edgesPath]: EdgesService
  }
}
