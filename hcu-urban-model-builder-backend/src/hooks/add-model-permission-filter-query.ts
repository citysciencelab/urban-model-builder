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

    // Convert query to use fully qualified column names
    // because there are duplicate column names because of the join e.g. parentId
    if (context.params.query) {
      context.params.query = Object.entries(context.params.query).reduce((acc, [key, value]) => {
        acc[`${service.options.name}.${key}`] = value
        return acc
      }, {} as any)
    }
    const query = service.createQuery(context.params)

    const postgresqlClient = context.app.get('postgresqlClient')

    query
      .join('models_versions', `${service.options.name}.modelsVersionsId`, '=', 'models_versions.id')
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
        }).orWhereNotNull('models_versions.publishedAt')
      })

    context.params.knex = query
  }
}
