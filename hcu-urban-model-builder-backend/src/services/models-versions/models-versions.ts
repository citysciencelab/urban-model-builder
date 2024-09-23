// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  modelsVersionsDataValidator,
  modelsVersionsPatchValidator,
  modelsVersionsQueryValidator,
  modelsVersionsResolver,
  modelsVersionsExternalResolver,
  modelsVersionsDataResolver,
  modelsVersionsPatchResolver,
  modelsVersionsQueryResolver
} from './models-versions.schema.js'

import type { Application } from '../../declarations.js'
import { ModelsVersionsService, getOptions } from './models-versions.class.js'
import { modelsVersionsPath, modelsVersionsMethods } from './models-versions.shared.js'

export * from './models-versions.class.js'
export * from './models-versions.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const modelsVersions = (app: Application) => {
  // Register our service on the Feathers application
  app.use(modelsVersionsPath, new ModelsVersionsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: modelsVersionsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(modelsVersionsPath).hooks({
    around: {
      all: [
        authenticate('oidc'),
        schemaHooks.resolveExternal(modelsVersionsExternalResolver),
        schemaHooks.resolveResult(modelsVersionsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(modelsVersionsQueryValidator),
        schemaHooks.resolveQuery(modelsVersionsQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(modelsVersionsDataValidator),
        schemaHooks.resolveData(modelsVersionsDataResolver)
      ],
      patch: [
        schemaHooks.validateData(modelsVersionsPatchValidator),
        schemaHooks.resolveData(modelsVersionsPatchResolver)
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
    [modelsVersionsPath]: ModelsVersionsService
  }
}
