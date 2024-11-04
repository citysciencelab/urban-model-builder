// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  userDataValidator,
  userPatchValidator,
  userQueryValidator,
  userResolver,
  userExternalResolver,
  userDataResolver,
  userPatchResolver,
  userQueryResolver
} from './users.schema.js'

import type { Application } from '../../declarations.js'
import { UserService, getOptions } from './users.class.js'
import { userPath, userMethods } from './users.shared.js'
import { iff, isProvider } from 'feathers-hooks-common'

export * from './users.class.js'
export * from './users.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const user = (app: Application) => {
  // Register our service on the Feathers application
  app.use(userPath, new UserService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: userMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(userPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(userExternalResolver), schemaHooks.resolveResult(userResolver)],
      find: [],
      get: [],
      create: [],
      update: [],
      patch: [],
      remove: []
    },
    before: {
      all: [schemaHooks.validateQuery(userQueryValidator), schemaHooks.resolveQuery(userQueryResolver)],
      find: [
        iff(isProvider('external'), (context: any) => {
          delete context.params.query.id
        })
      ],
      get: [
        iff(isProvider('external'), (context: any) => {
          delete context.params.query.id
        })
      ],
      create: [schemaHooks.validateData(userDataValidator), schemaHooks.resolveData(userDataResolver)],
      patch: [schemaHooks.validateData(userPatchValidator), schemaHooks.resolveData(userPatchResolver)],
      remove: []
    },
    after: {
      all: [],
      find: [
        // keep only ID and email
        iff(isProvider('external'), (context: any) => {
          context.result.data = context.result.data.map((user: any) => ({
            id: user.id,
            email: user.email
          }))
        })
      ],
      get: [
        // keep only ID and email when not self
        iff(isProvider('external'), (context: any) => {
          const user = context.result
          if (user.id !== context.params.user.id) {
            context.result.data = context.result = {
              id: user.id,
              email: user.email
            }
          }
          return context
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
    [userPath]: UserService
  }
}
