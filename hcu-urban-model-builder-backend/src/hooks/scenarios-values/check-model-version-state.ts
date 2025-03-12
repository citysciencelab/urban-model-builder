import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../../declarations.ts'
import _ from 'lodash'
import { checkModelVersionState } from '../check-model-version-state.js'

export const checkScenarioValueModelVersionState = (scenarioIdField: string) => {
  const _checkModelVersionState = checkModelVersionState(
    'params.stashedScenario.modelsVersionsId',
    'models-versions'
  )

  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch', 'remove'])

    if (Array.isArray(context.data)) {
      throw new Error('Batch operation is not supported')
    }

    const scenarioId = _.get(context, scenarioIdField, null)

    if (!scenarioId) {
      throw new Error('Scenario ID not found in specified context path')
    }

    // Get the scenario to find the associated model version
    context.params.stashedScenario = await context.app
      .service('scenarios')
      .get(scenarioId, { user: context.params.user })

    if (!context.params.stashedScenario || !context.params.stashedScenario.modelsVersionsId) {
      throw new Error('Could not find valid model version associated with this scenario')
    }

    await _checkModelVersionState(context)
  }
}
