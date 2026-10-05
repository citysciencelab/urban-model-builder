// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  scenariosCreateValidator,
  scenariosPatchValidator,
  scenariosQueryValidator,
  scenariosResolver,
  scenariosExternalResolver,
  scenariosDataResolver,
  scenariosPatchResolver,
  scenariosQueryResolver
} from './scenarios.schema.js'

import { STASH_BEFORE_KEY, type Application, type HookContext } from '../../declarations.js'
import { ScenariosService, getOptions } from './scenarios.class.js'
import { scenariosPath, scenariosMethods } from './scenarios.shared.js'
import { addModelPermissionFilterQuery } from '../../hooks/add-model-permission-filter-query.js'
import { Roles } from '../../client.js'
import { iff, isProvider } from 'feathers-hooks-common'
import { checkModelPermission } from '../../hooks/check-model-permission.js'
import { checkModelVersionState } from '../../hooks/check-model-version-state.js'
import { preventFieldChanges } from '../../hooks/prevent-field-changes.js'

export * from './scenarios.class.js'
export * from './scenarios.schema.js'

// The default scenario is part of the model definition: collaborators may
// change it, but only on the latest unpublished draft. Named scenarios are
// presets that only the owner manages, also on published versions; see
// checkScenarioValueModelVersionState.
const checkScenarioWriteAccess = (
  modelsVersionsIdField: string,
  isDefaultScenario: (context: HookContext) => boolean
) =>
  iff(
    isDefaultScenario,
    checkModelPermission(modelsVersionsIdField, 'models-versions', Roles.collaborator),
    checkModelVersionState(modelsVersionsIdField, 'models-versions')
  ).else(checkModelPermission(modelsVersionsIdField, 'models-versions', Roles.owner))

// A configure function that registers the service and its hooks via `app.configure`
export const scenarios = (app: Application) => {
  // Register our service on the Feathers application
  app.use(scenariosPath, new ScenariosService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: scenariosMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(scenariosPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(scenariosExternalResolver),
        schemaHooks.resolveResult(scenariosResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(scenariosQueryValidator),
        schemaHooks.resolveQuery(scenariosQueryResolver)
      ],
      find: [addModelPermissionFilterQuery(Roles.viewer)],
      get: [addModelPermissionFilterQuery(Roles.viewer)],
      create: [
        schemaHooks.validateData(scenariosCreateValidator),
        schemaHooks.resolveData(scenariosDataResolver),
        iff(
          isProvider('external'),
          checkScenarioWriteAccess('data.modelsVersionsId', (context) => context.data.isDefault)
        )
      ],
      patch: [
        schemaHooks.validateData(scenariosPatchValidator),
        schemaHooks.resolveData(scenariosPatchResolver),
        iff(
          isProvider('external'),
          // The access check reads the scenario as it was before the patch.
          preventFieldChanges(['isDefault', 'modelsVersionsId']),
          checkScenarioWriteAccess(
            `params.${STASH_BEFORE_KEY}.modelsVersionsId`,
            (context) => context.params[STASH_BEFORE_KEY].isDefault
          )
        )
      ],
      remove: [
        iff(
          isProvider('external'),
          checkScenarioWriteAccess(
            `params.${STASH_BEFORE_KEY}.modelsVersionsId`,
            (context) => context.params[STASH_BEFORE_KEY].isDefault
          )
        )
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
    [scenariosPath]: ScenariosService
  }
}
