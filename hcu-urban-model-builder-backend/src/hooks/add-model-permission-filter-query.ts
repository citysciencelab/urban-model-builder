import { KnexService } from '@feathersjs/knex'
import { HookContext } from '../declarations.js'
import { isServerCall } from '../utils/is-server-call.js'
import { Roles } from '../client.js'

export const addModelPermissionFilterQuery = (minRequiredRole: Roles) => {
  return (context: HookContext) => {
    const userId = context.params?.user?.id
    if (isServerCall(context.params) && !userId) {
      return
    }

    if (!userId) {
      throw new Error('nodes:find: params.user.id is required but not set. Probably missing authentication.')
    }

    const service = context.service as KnexService
    const query = service.createQuery(context.params)

    query
      .join('models_versions', `${service.options.name}.modelsVersionsId`, '=', 'models_versions.id')
      .join('models_users', 'models_versions.modelId', '=', 'models_users.modelId')
      .where(function () {
        this.where(function () {
          this.where('models_users.userId', userId).andWhere('models_users.role', '>=', minRequiredRole)
        }).orWhereNotNull('models_versions.publishedAt')
      })

    context.params.knex = query
  }
}
