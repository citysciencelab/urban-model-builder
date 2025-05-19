// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  adminPublicModelVersionsUnapprovePatchValidator,
  adminPublicModelVersionsUnapproveQueryValidator,
  adminPublicModelVersionsUnapproveResolver,
  adminPublicModelVersionsUnapproveExternalResolver,
  adminPublicModelVersionsUnapprovePatchResolver,
  adminPublicModelVersionsUnapproveQueryResolver
} from './unapprove.schema.js'

import type { Application } from '../../../../declarations.js'
import { AdminPublicModelVersionsUnapproveService, getOptions } from './unapprove.class.js'
import {
  adminPublicModelVersionsUnapprovePath,
  adminPublicModelVersionsUnapproveMethods
} from './unapprove.shared.js'

export * from './unapprove.class.js'
export * from './unapprove.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const adminPublicModelVersionsUnapprove = (app: Application) => {
  // Register our service on the Feathers application
  app.use(
    adminPublicModelVersionsUnapprovePath,
    new AdminPublicModelVersionsUnapproveService(getOptions(app)),
    {
      // A list of all methods this service exposes externally
      methods: adminPublicModelVersionsUnapproveMethods,
      // You can add additional custom events to be sent to clients here
      events: []
    }
  )
  // Initialize hooks
  app.service(adminPublicModelVersionsUnapprovePath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(adminPublicModelVersionsUnapproveExternalResolver),
        schemaHooks.resolveResult(adminPublicModelVersionsUnapproveResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(adminPublicModelVersionsUnapproveQueryValidator),
        schemaHooks.resolveQuery(adminPublicModelVersionsUnapproveQueryResolver)
      ],
      patch: [
        schemaHooks.validateData(adminPublicModelVersionsUnapprovePatchValidator),
        schemaHooks.resolveData(adminPublicModelVersionsUnapprovePatchResolver)
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
declare module '../../../../declarations.js' {
  interface ServiceTypes {
    [adminPublicModelVersionsUnapprovePath]: AdminPublicModelVersionsUnapproveService
  }
}
