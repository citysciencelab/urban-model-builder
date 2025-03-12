// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../../declarations.ts'
import { Roles } from '../../client.js'
import _ from 'lodash'
import { checkModelPermission } from '../check-model-permission.js'

export const checkScenarioValuePermission = (scenarioIdField: string, minRole: Roles) => {
  const _checkModelPermission = checkModelPermission(
    'params.stashedScenario.modelsVersionsId',
    'models-versions',
    minRole
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

    await _checkModelPermission(context)
  }
}
