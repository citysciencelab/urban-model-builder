// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../../declarations.ts'
import { Roles } from '../../client.js'
import _ from 'lodash'
import { checkModelPermission } from '../check-model-permission.js'

// `minRole` applies to the values of the default scenario,
// `namedScenarioMinRole` to the values of a named scenario (preset).
export const checkScenarioValuePermission = (
  scenarioIdField: string,
  minRole: Roles,
  namedScenarioMinRole: Roles = minRole
) => {
  const checkDefaultScenarioPermission = checkModelPermission(
    'params.stashedScenario.modelsVersionsId',
    'models-versions',
    minRole
  )
  const checkNamedScenarioPermission = checkModelPermission(
    'params.stashedScenario.modelsVersionsId',
    'models-versions',
    namedScenarioMinRole
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

    context.params.stashedScenario = await context.app
      .service('scenarios')
      .get(scenarioId, { user: context.params.user })

    if (!context.params.stashedScenario || !context.params.stashedScenario.modelsVersionsId) {
      throw new Error('Could not find valid model version associated with this scenario')
    }

    if (context.params.stashedScenario.isDefault) {
      await checkDefaultScenarioPermission(context)
    } else {
      await checkNamedScenarioPermission(context)
    }
  }
}
