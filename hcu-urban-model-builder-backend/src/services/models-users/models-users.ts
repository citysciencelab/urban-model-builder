// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  modelsUsersDataValidator,
  modelsUsersPatchValidator,
  modelsUsersQueryValidator,
  modelsUsersResolver,
  modelsUsersExternalResolver,
  modelsUsersDataResolver,
  modelsUsersPatchResolver,
  modelsUsersQueryResolver,
  ModelsUsersData
} from './models-users.schema.js'

import type { Application, HookContext } from '../../declarations.js'
import { ModelsUsersService, getOptions } from './models-users.class.js'
import { modelsUsersPath, modelsUsersMethods } from './models-users.shared.js'
import { disallow, iff, isProvider } from 'feathers-hooks-common'
import { Roles } from '../../client.js'

export * from './models-users.class.js'
export * from './models-users.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const modelsUsers = (app: Application) => {
  // Register our service on the Feathers application
  app.use(modelsUsersPath, new ModelsUsersService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: modelsUsersMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(modelsUsersPath).hooks({
    around: {
      all: [
        authenticate('oidc'),
        schemaHooks.resolveExternal(modelsUsersExternalResolver),
        schemaHooks.resolveResult(modelsUsersResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(modelsUsersQueryValidator),
        schemaHooks.resolveQuery(modelsUsersQueryResolver)
      ],
      find: [
        iff(isProvider('external'), async (context) => {
          if (context?.params?.query?.modelId == null) {
            throw new Error('modelId is required and must be a number')
          }
          if (context.params.query.modelId) {
            // get the model with current users permissions
            const model = await context.app
              .service('models')
              .get(context.params.query.modelId as number, { user: context.params.user })
            if (model.role == null || model.role < Roles.co_owner) {
              throw new Error("You don't have the permission to list permissions for this model")
            }
          }
          return context
        })
      ],
      get: [iff(isProvider('external'), disallow())],
      create: [
        schemaHooks.validateData(modelsUsersDataValidator),
        schemaHooks.resolveData(modelsUsersDataResolver),
        async (context) => {
          // user must have role >= co-owner to be able to create a permission for this model
          if (context.data) {
            const permissionData = context.data as ModelsUsersData
            // get the model with current users permissions
            const model = await context.app
              .service('models')
              .get(permissionData.modelId, { user: context.params.user })
            if (model.role == null || model.role < Roles.co_owner) {
              throw new Error("You don't have the permission to add a user to this model")
            }
          }
        }
      ],
      patch: [
        schemaHooks.validateData(modelsUsersPatchValidator),
        schemaHooks.resolveData(modelsUsersPatchResolver)
      ],
      remove: [
        async (context) => {
          // user must have role >= co-owner to be able to change a permission for this model
          if (context.id) {
            const modelsUsers = await context.app.service('models-users').get(context.id)
            const model = await context.app
              .service('models')
              .get(modelsUsers.modelId, { user: context.params.user })
            if (model.role == null || model.role < Roles.co_owner) {
              throw new Error("You don't have the permission to change a user's role for this model")
            }
          }
        }
      ]
    },
    after: {
      all: [],
      find: [
        iff(isProvider('external'), async (context: HookContext) => {
          // for each result replace the user id with the user objects field email
          if (context.result?.data) {
            for (const result of context.result.data) {
              const user = await context.app.service('users').get(result.userId)
              result.userEmail = user.email
            }
          }
        })
      ]
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations.js' {
  interface ServiceTypes {
    [modelsUsersPath]: ModelsUsersService
  }
}
