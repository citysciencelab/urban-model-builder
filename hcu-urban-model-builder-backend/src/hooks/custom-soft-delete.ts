import { checkContext } from 'feathers-hooks-common'
import _ from 'lodash'
import { HookContext } from '../declarations.js'

// INFO: modified copy of https://github.com/feathersjs-ecosystem/feathers-hooks-common/blob/ac72fa3981566431d303a10f9a37b21486d33a69/lib/services/soft-delete.js
export default ({ skipForFind = false } = {}) =>
  async (context: HookContext) => {
    const { service, method, params } = context
    const { query = {}, disableSoftDelete, isDeleteRelated } = params

    checkContext(context, 'before', null)

    if (disableSoftDelete) {
      if (method === 'remove') {
        context.params.isFinalDelete = true
      }
    } else {
      if (method !== 'get' && !(method === 'find' && skipForFind)) {
        context.params.query = Object.assign({}, query, {
          deletedAt: null
        })
      }

      if (method === 'create') {
        _.set(context, 'data.deletedAt', null)
      } else if (method === 'remove') {
        const result = await service.patch(
          context.id || null,
          {
            deletedAt: new Date().toISOString()
          },
          {
            query: Object.assign({}, context.params.query),
            isSoftDelete: true,
            isDeleteRelated,
            user: params.user
          }
        )

        context.result = result
      }
    }

    return context
  }
