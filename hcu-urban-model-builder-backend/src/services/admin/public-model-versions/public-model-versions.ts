// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import feathersSwagger from 'feathers-swagger'

import {
  adminPublicModelVersionsQueryValidator,
  adminPublicModelVersionsResolver,
  adminPublicModelVersionsExternalResolver,
  adminPublicModelVersionsQueryResolver,
  adminPublicModelVersionsSchema
} from './public-model-versions.schema.js'

import type { Application } from '../../../declarations.js'
import { AdminPublicModelVersionsService, getOptions } from './public-model-versions.class.js'
import {
  adminPublicModelVersionsPath,
  adminPublicModelVersionsMethods
} from './public-model-versions.shared.js'

export * from './public-model-versions.class.js'
export * from './public-model-versions.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const adminPublicModelVersions = (app: Application) => {
  // Register our service on the Feathers application
  app.use(adminPublicModelVersionsPath, new AdminPublicModelVersionsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: adminPublicModelVersionsMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
    docs: feathersSwagger.createSwaggerServiceOptions({
      schemas: {
        adminPublicModelVersionsSchema
      }
    })
  })

  // Initialize hooks
  app.service(adminPublicModelVersionsPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(adminPublicModelVersionsExternalResolver),
        schemaHooks.resolveResult(adminPublicModelVersionsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(adminPublicModelVersionsQueryValidator),
        schemaHooks.resolveQuery(adminPublicModelVersionsQueryResolver)
      ],
      find: []
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
declare module '../../../declarations.js' {
  interface ServiceTypes {
    [adminPublicModelVersionsPath]: AdminPublicModelVersionsService
  }
}
