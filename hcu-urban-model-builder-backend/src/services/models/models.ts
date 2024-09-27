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
  modelsSimulateResolver,
  modelsNewDraftSimulateValidator,
  modelsNewDraftSimulateResolver,
  modelsPublishValidator,
  modelsPublishResolver,
  modelsCloneVersionSchema,
  modelsCloneVersionResolver,
  modelsCloneVersionValidator
} from './models.schema.js'

import type { Application } from '../../declarations.js'
import { ModelsService, getOptions } from './models.class.js'
import { modelsPath, modelsMethods } from './models.shared.js'
import { authenticate } from '@feathersjs/authentication'
import customSoftDelete from '../../hooks/custom-soft-delete.js'
import { setCreatedBy } from '../../hooks/set-created-by.js'
import { filterCreatedBy } from '../../hooks/filter-created-by.js'
import { ensureCreatedBy } from '../../hooks/ensure-created-by.js'
import { iff, isProvider } from 'feathers-hooks-common'
import { initModelDefaults } from './hooks/init-model-defaults.js'
import { initModelVersion } from './hooks/init-model-version.js'
import { ServiceAddons } from '@feathersjs/feathers'
import { EventEmitter } from 'stream'
import { touchParent } from '../../utils/touch-parent.js'

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
      find: [customSoftDelete(), filterCreatedBy],
      get: [customSoftDelete(), filterCreatedBy],
      create: [
        schemaHooks.validateData(modelsDataValidator),
        schemaHooks.resolveData(modelsDataResolver),
        customSoftDelete(),
        setCreatedBy,
        iff(isProvider('external'), initModelDefaults)
      ],
      patch: [
        schemaHooks.validateData(modelsPatchValidator),
        schemaHooks.resolveData(modelsPatchResolver),
        iff(isProvider('external'), ensureCreatedBy),
        customSoftDelete()
      ],
      remove: [iff(isProvider('external'), ensureCreatedBy), customSoftDelete()],
      simulate: [
        schemaHooks.validateData(modelsSimulateValidator),
        schemaHooks.resolveData(modelsSimulateResolver)
      ],
      newDraft: [
        schemaHooks.validateData(modelsNewDraftSimulateValidator),
        schemaHooks.resolveData(modelsNewDraftSimulateResolver)
      ],
      publishMinor: [
        schemaHooks.validateData(modelsPublishValidator),
        schemaHooks.resolveData(modelsPublishResolver)
      ],
      cloneVersion: [
        schemaHooks.validateData(modelsCloneVersionValidator),
        schemaHooks.resolveData(modelsCloneVersionResolver)
      ]
    },
    after: {
      all: [],
      create: [iff(isProvider('external'), initModelVersion)]
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
