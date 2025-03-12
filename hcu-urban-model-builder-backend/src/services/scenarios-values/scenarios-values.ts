// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  scenarioValuesDataValidator,
  scenarioValuesPatchValidator,
  scenarioValuesQueryValidator,
  scenarioValuesResolver,
  scenarioValuesExternalResolver,
  scenarioValuesDataResolver,
  scenarioValuesPatchResolver,
  scenarioValuesQueryResolver
} from './scenarios-values.schema.js'

import { STASH_BEFORE_KEY, type Application } from '../../declarations.js'
import { ScenarioValuesService, getOptions } from './scenarios-values.class.js'
import { scenarioValuesPath, scenarioValuesMethods } from './scenarios-values.shared.js'
import { Roles } from '../../client.js'
import { addScenarioValuesModelPermissionFilterQuery } from '../../hooks/scenarios-values/add-model-permission-filter-query.js'
import { iff, isProvider } from 'feathers-hooks-common'
import { checkScenarioValuePermission } from '../../hooks/scenarios-values/check-model-permission.js'
import { checkScenarioValueModelVersionState } from '../../hooks/scenarios-values/check-model-version-state.js'

export * from './scenarios-values.class.js'
export * from './scenarios-values.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const scenarioValues = (app: Application) => {
  // Register our service on the Feathers application
  app.use(scenarioValuesPath, new ScenarioValuesService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: scenarioValuesMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(scenarioValuesPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(scenarioValuesExternalResolver),
        schemaHooks.resolveResult(scenarioValuesResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(scenarioValuesQueryValidator),
        schemaHooks.resolveQuery(scenarioValuesQueryResolver)
      ],
      find: [addScenarioValuesModelPermissionFilterQuery(Roles.viewer)],
      get: [addScenarioValuesModelPermissionFilterQuery(Roles.viewer)],
      create: [
        schemaHooks.validateData(scenarioValuesDataValidator),
        schemaHooks.resolveData(scenarioValuesDataResolver),
        iff(
          isProvider('external'),
          checkScenarioValuePermission('data.scenariosId', Roles.collaborator),
          checkScenarioValueModelVersionState('data.scenariosId')
        )
      ],
      patch: [
        schemaHooks.validateData(scenarioValuesPatchValidator),
        schemaHooks.resolveData(scenarioValuesPatchResolver),
        iff(
          isProvider('external'),
          checkScenarioValuePermission(`params.${STASH_BEFORE_KEY}.scenariosId`, Roles.collaborator),
          checkScenarioValueModelVersionState(`params.${STASH_BEFORE_KEY}.scenariosId`)
        )
      ],
      remove: [
        iff(
          isProvider('external'),
          checkScenarioValuePermission(`params.${STASH_BEFORE_KEY}.scenariosId`, Roles.collaborator),
          checkScenarioValueModelVersionState(`params.${STASH_BEFORE_KEY}.scenariosId`)
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
    [scenarioValuesPath]: ScenarioValuesService
  }
}
