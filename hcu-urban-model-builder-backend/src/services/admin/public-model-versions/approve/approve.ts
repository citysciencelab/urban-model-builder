// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  adminPublicModelVersionsApprovePatchValidator,
  adminPublicModelVersionsApproveQueryValidator,
  adminPublicModelVersionsApproveResolver,
  adminPublicModelVersionsApproveExternalResolver,
  adminPublicModelVersionsApprovePatchResolver,
  adminPublicModelVersionsApproveQueryResolver
} from './approve.schema.js'

import type { Application } from '../../../../declarations.js'
import { AdminPublicModelVersionsApproveService, getOptions } from './approve.class.js'
import {
  adminPublicModelVersionsApprovePath,
  adminPublicModelVersionsApproveMethods
} from './approve.shared.js'

export * from './approve.class.js'
export * from './approve.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const adminPublicModelVersionsApprove = (app: Application) => {
  // Register our service on the Feathers application
  app.use(adminPublicModelVersionsApprovePath, new AdminPublicModelVersionsApproveService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: adminPublicModelVersionsApproveMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(adminPublicModelVersionsApprovePath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(adminPublicModelVersionsApproveExternalResolver),
        schemaHooks.resolveResult(adminPublicModelVersionsApproveResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(adminPublicModelVersionsApproveQueryValidator),
        schemaHooks.resolveQuery(adminPublicModelVersionsApproveQueryResolver)
      ],
      patch: [
        schemaHooks.validateData(adminPublicModelVersionsApprovePatchValidator),
        schemaHooks.resolveData(adminPublicModelVersionsApprovePatchResolver)
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
    [adminPublicModelVersionsApprovePath]: AdminPublicModelVersionsApproveService
  }
}
