// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  modelsDataValidator,
  modelsPatchValidator,
  modelsQueryValidator,
  modelsResolver,
  modelsExternalResolver,
  modelsDataResolver,
  modelsPatchResolver,
  modelsQueryResolver,
  modelsSimulateValidator,
  modelsSimulateResolver
} from './models.schema.js'

import type { Application } from '../../declarations.js'
import { ModelsService, getOptions } from './models.class.js'
import { modelsPath, modelsMethods } from './models.shared.js'
import { authenticate } from '@feathersjs/authentication'

export * from './models.class.js'
export * from './models.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const models = (app: Application) => {
  // Register our service on the Feathers application
  app.use(modelsPath, new ModelsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: modelsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(modelsPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(modelsExternalResolver), schemaHooks.resolveResult(modelsResolver)]
    },
    before: {
      all: [
        authenticate('oidc'),
        schemaHooks.validateQuery(modelsQueryValidator),
        schemaHooks.resolveQuery(modelsQueryResolver)
      ],
      find: [],
      get: [],
      create: [schemaHooks.validateData(modelsDataValidator), schemaHooks.resolveData(modelsDataResolver)],
      patch: [schemaHooks.validateData(modelsPatchValidator), schemaHooks.resolveData(modelsPatchResolver)],
      remove: [],
      simulate: [
        schemaHooks.validateData(modelsSimulateValidator),
        schemaHooks.resolveData(modelsSimulateResolver)
      ]
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
    [modelsPath]: ModelsService
  }
}
