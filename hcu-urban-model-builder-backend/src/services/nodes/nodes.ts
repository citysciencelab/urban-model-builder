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

import { STASH_BEFORE_KEY, type Application } from '../../declarations.js'
import { NodesService, getOptions } from './nodes.class.js'
import { nodesPath, nodesMethods } from './nodes.shared.js'
import { Roles } from '../../client.js'
import { iff, isProvider } from 'feathers-hooks-common'
import { checkModelPermission } from '../../hooks/check-model-permission.js'
import { checkModelVersionState } from '../../hooks/check-model-version-state.js'
import { manageDefaultScenariosValues } from './hooks/manage-default-scenarios-values.js'
import { emitRemovedEventsForCascadingRemove } from '../../hooks/nodes/emit-removed-events-for-cascading-remove.js'
import { addModelPermissionFilterQuery } from '../../hooks/add-model-permission-filter-query.js'

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
      all: [schemaHooks.resolveExternal(nodesExternalResolver), schemaHooks.resolveResult(nodesResolver)],
      remove: [emitRemovedEventsForCascadingRemove()]
    },
    before: {
      all: [schemaHooks.validateQuery(nodesQueryValidator), schemaHooks.resolveQuery(nodesQueryResolver)],
      find: [addModelPermissionFilterQuery(Roles.viewer)],
      get: [addModelPermissionFilterQuery(Roles.viewer)],
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
          checkModelPermission(
            `params.${STASH_BEFORE_KEY}.modelsVersionsId`,
            'models-versions',
            Roles.collaborator
          ),
          checkModelVersionState(`params.${STASH_BEFORE_KEY}.modelsVersionsId`, 'models-versions')
        )
      ],
      remove: [
        iff(
          isProvider('external'),
          checkModelPermission(
            `params.${STASH_BEFORE_KEY}.modelsVersionsId`,
            'models-versions',
            Roles.collaborator
          ),
          checkModelVersionState(`params.${STASH_BEFORE_KEY}.modelsVersionsId`, 'models-versions')
        )
      ]
    },
    after: {
      all: [],
      patch: [iff(isProvider('external'), manageDefaultScenariosValues)],
      remove: [iff(isProvider('external'), manageDefaultScenariosValues)]
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
