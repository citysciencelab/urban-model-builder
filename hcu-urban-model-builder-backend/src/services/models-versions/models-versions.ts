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
  modelsVersionsQueryResolver,
  modelsVersionsJoinChannelDataValidator,
  modelsVersionsLeaveChannelDataValidator
} from './models-versions.schema.js'

import type { Application } from '../../declarations.js'
import { ModelsVersionsService, getOptions } from './models-versions.class.js'
import { modelsVersionsPath, modelsVersionsMethods } from './models-versions.shared.js'
import { setCreatedBy } from '../../hooks/set-created-by.js'
import { discard, iff, isProvider } from 'feathers-hooks-common'
import _ from 'lodash'
import { checkModelPermission } from '../../hooks/check-model-permission.js'
import { Roles } from '../../client.js'

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

  const queryOrOnlyWhenPermissions = { role: { $gt: 0 } }
  const queryOrWhenPublished = { publishedAt: { $ne: null } }
  // Initialize hooks
  app.service(modelsVersionsPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(modelsVersionsExternalResolver),
        schemaHooks.resolveResult(modelsVersionsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(modelsVersionsQueryValidator),
        schemaHooks.resolveQuery(modelsVersionsQueryResolver)
      ],
      find: [
        // TODO: test and shift to external hook function
        iff(isProvider('external'), (context: any) => {
          _.set(context, 'params.query.$or', [queryOrOnlyWhenPermissions, queryOrWhenPublished])
          // necessary because of the join -> be more specific about the table origin of modelId
          if ('modelId' in context.params.query) {
            context.params.query['models_versions.modelId'] = context.params.query.modelId
            delete context.params.query.modelId
          }
        })
      ],
      get: [
        iff(isProvider('external'), (context) => {
          _.set(context, 'params.query.$or', [queryOrOnlyWhenPermissions, queryOrWhenPublished])
        })
      ],
      create: [
        schemaHooks.validateData(modelsVersionsDataValidator),
        schemaHooks.resolveData(modelsVersionsDataResolver),
        setCreatedBy
      ],
      patch: [
        iff(isProvider('external'), discard('publishedAt')),
        schemaHooks.validateData(modelsVersionsPatchValidator),
        schemaHooks.resolveData(modelsVersionsPatchResolver)
      ],
      remove: [],
      joinChannel: [
        schemaHooks.validateData(modelsVersionsJoinChannelDataValidator),
        checkModelPermission('data.id', 'models-versions', Roles.viewer)
      ],
      leaveChannel: [
        schemaHooks.validateData(modelsVersionsLeaveChannelDataValidator),
        checkModelPermission('data.id', 'models-versions', Roles.viewer)
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
    [modelsVersionsPath]: ModelsVersionsService
  }
}
