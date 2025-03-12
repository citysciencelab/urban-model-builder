import { KnexService } from '@feathersjs/knex'
import { HookContext } from '../../declarations.js'
import { isServerCall } from '../../utils/is-server-call.js'
import { Roles } from '../../client.js'
import { ScenarioValuesService } from '../../services/scenarios-values/scenarios-values.class.js'

export const addScenarioValuesModelPermissionFilterQuery = (minRequiredRole: Roles) => {
  return (context: HookContext<ScenarioValuesService>) => {
    const userId = context.params?.user?.id
    if (isServerCall(context.params) && !userId) {
      return
    }

    if (!userId) {
      throw new Error('nodes:find: params.user.id is required but not set. Probably missing authentication.')
    }

    const query = context.service.createQuery(context.params)

    query
      .join('scenarios', `scenarios_values.scenariosId`, '=', 'scenarios.id')
      .join('models_versions', 'scenarios.modelsVersionsId', '=', 'models_versions.id')
      .join('models_users', 'models_versions.modelId', '=', 'models_users.modelId')
      .where(function () {
        this.where(function () {
          this.where('models_users.userId', userId).andWhere('models_users.role', '>=', minRequiredRole)
        })
        if (minRequiredRole === Roles.viewer) {
          this.orWhereNotNull('models_versions.publishedAt')
        }
      })
      .select('models_users.role as modelRole')

    console.log('query', query.toSQL())

    context.params.knex = query
  }
}
