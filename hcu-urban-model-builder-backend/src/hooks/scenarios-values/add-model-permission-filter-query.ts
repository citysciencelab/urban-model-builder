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
    const postgresqlClient = context.app.get('postgresqlClient')

    // Only the current user's membership is joined. Joining every member made
    // a published version return each value once per member, and `get` then
    // reported such a value as not found.
    query
      .join('scenarios', `scenarios_values.scenariosId`, '=', 'scenarios.id')
      .join('models_versions', 'scenarios.modelsVersionsId', '=', 'models_versions.id')
      .leftJoin('models_users', function () {
        this.on('models_versions.modelId', '=', 'models_users.modelId').andOn(
          'models_users.userId',
          '=',
          postgresqlClient.raw('?', [userId])
        )
      })
      .where(function () {
        this.where(function () {
          this.where('models_users.userId', userId).andWhere('models_users.role', '>=', minRequiredRole)
        })
        if (minRequiredRole === Roles.viewer) {
          this.orWhereNotNull('models_versions.publishedAt')
        }
      })

    context.params.knex = query
  }
}
