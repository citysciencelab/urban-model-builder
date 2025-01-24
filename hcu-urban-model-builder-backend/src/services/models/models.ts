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
  modelsCloneVersionValidator,
  ModelsPublish
} from './models.schema.js'

import type { Application, HookContext } from '../../declarations.js'
import { ModelsParams, ModelsService, getOptions } from './models.class.js'
import { modelsPath, modelsMethods } from './models.shared.js'
import { authenticate } from '@feathersjs/authentication'
import customSoftDelete from '../../hooks/custom-soft-delete.js'
import { setCreatedBy } from '../../hooks/set-created-by.js'
import { permissionFilter } from '../../hooks/permission-filter.js'
import { disallow, iff, isProvider } from 'feathers-hooks-common'
import { initModelDefaults } from './hooks/init-model-defaults.js'
import { initModelVersion } from './hooks/init-model-version.js'
import { initModelsUsers } from '../../hooks/init-models-users.js'
import { checkPublishPermissionsAndState } from './hooks/check-publish-permissions-and-state.js'
import { checkClonePermissionsAndState } from './hooks/check-clone-permissions-and-state.js'
import { checkNewDraftPermissionsAndState } from './hooks/check-new-draft-permissions-and-state.js'
import _ from 'lodash'
import { Roles } from '../../client.js'

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
      all: [schemaHooks.validateQuery(modelsQueryValidator), schemaHooks.resolveQuery(modelsQueryResolver)],
      find: [customSoftDelete(), permissionFilter],
      get: [customSoftDelete(), permissionFilter],
      create: [
        setCreatedBy,
        schemaHooks.validateData(modelsDataValidator),
        schemaHooks.resolveData(modelsDataResolver),
        customSoftDelete(),
        iff(isProvider('external'), initModelDefaults)
      ],
      patch: [
        schemaHooks.validateData(modelsPatchValidator),
        schemaHooks.resolveData(modelsPatchResolver),
        iff(isProvider('external'), async (context) => {
          _.set(context, 'params.query', {
            role: { $gte: Roles.co_owner }
          })
          // TODO: check if model can be patched due to the state
        }),
        customSoftDelete()
      ],
      remove: [
        iff(isProvider('external'), async (context) => {
          _.set(context, 'params.query', {
            role: { $gte: Roles.owner }
          })
        }),
        customSoftDelete()
      ],
      simulate: [
        disallow('external'),
        schemaHooks.validateData(modelsSimulateValidator),
        schemaHooks.resolveData(modelsSimulateResolver)
      ],
      newDraft: [
        schemaHooks.validateData(modelsNewDraftSimulateValidator),
        schemaHooks.resolveData(modelsNewDraftSimulateResolver),
        iff(isProvider('external'), checkNewDraftPermissionsAndState)
      ],
      publishMinor: [
        schemaHooks.validateData(modelsPublishValidator),
        schemaHooks.resolveData(modelsPublishResolver),
        iff(isProvider('external'), checkPublishPermissionsAndState)
      ],
      publishMajor: [
        schemaHooks.validateData(modelsPublishValidator),
        schemaHooks.resolveData(modelsPublishResolver),
        iff(isProvider('external'), checkPublishPermissionsAndState)
      ],
      cloneVersion: [
        schemaHooks.validateData(modelsCloneVersionValidator),
        schemaHooks.resolveData(modelsCloneVersionResolver),
        iff(isProvider('external'), checkClonePermissionsAndState)
      ]
    },
    after: {
      all: [],
      create: [iff(isProvider('external'), initModelsUsers, initModelVersion)]
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
