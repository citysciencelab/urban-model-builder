// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  nodesDataValidator,
  nodesPatchValidator,
  nodesQueryValidator,
  nodesResolver,
  nodesExternalResolver,
  nodesDataResolver,
  nodesPatchResolver,
  nodesQueryResolver,
  Nodes
} from './nodes.schema.js'

import type { Application } from '../../declarations.js'
import { NodesService, getOptions } from './nodes.class.js'
import { nodesPath, nodesMethods } from './nodes.shared.js'
import { Roles } from '../../client.js'
import { iff, isProvider } from 'feathers-hooks-common'
import { authenticate } from '@feathersjs/authentication'
import { checkModelPermission } from '../../hooks/check-model-permission.js'
import { checkModelVersionState } from '../../hooks/check-model-version-state.js'
import { Paginated } from '@feathersjs/feathers'
import { manageDefaultScenariosValues } from './hooks/manage-default-scenarios-values.js'

export * from './nodes.class.js'
export * from './nodes.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const nodes = (app: Application) => {
  // Register our service on the Feathers application
  app.use(nodesPath, new NodesService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: nodesMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })

  // Initialize hooks
  app.service(nodesPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(nodesExternalResolver), schemaHooks.resolveResult(nodesResolver)]
    },
    before: {
      all: [schemaHooks.validateQuery(nodesQueryValidator), schemaHooks.resolveQuery(nodesQueryResolver)],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(nodesDataValidator),
        schemaHooks.resolveData(nodesDataResolver),
        iff(
          isProvider('external'),
          checkModelPermission('data.modelsVersionsId', 'models-versions', Roles.collaborator),
          checkModelVersionState('data.modelsVersionsId', 'models-versions')
        )
      ],
      patch: [
        schemaHooks.validateData(nodesPatchValidator),
        schemaHooks.resolveData(nodesPatchResolver),
        iff(
          isProvider('external'),
          checkModelPermission('data.modelsVersionsId', 'models-versions', Roles.collaborator),
          checkModelVersionState('data.modelsVersionsId', 'models-versions')
        )
      ],
      remove: [
        iff(
          isProvider('external'),
          checkModelPermission('data.modelsVersionsId', 'models-versions', Roles.collaborator),
          checkModelVersionState('data.modelsVersionsId', 'models-versions')
        )
      ]
    },
    after: {
      all: [],
      patch: [iff(isProvider('external'), manageDefaultScenariosValues)]
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations.js' {
  interface ServiceTypes {
    [nodesPath]: NodesService
  }
}
