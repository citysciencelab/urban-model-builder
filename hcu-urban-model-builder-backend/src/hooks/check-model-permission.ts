// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext, ServiceNamesWithGet } from '../declarations.ts'
import { Roles } from '../client.js'
import _ from 'lodash'
import { Forbidden } from '@feathersjs/errors'
import { isServerCall } from '../utils/is-server-call.js'

export const checkModelPermission = (
  fkIdField: string,
  fkServiceName: ServiceNamesWithGet,
  minRole: Roles
) => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch', 'remove'])

    const user = context.params?.user
    if (isServerCall(context.params) && !user) {
      return
    }

    if (Array.isArray(context.data)) {
      throw new Error('Batch creation of nodes is not supported')
    }

    const fkId = _.get(context, fkIdField, null)

    if (!fkId) {
      throw new Error('id not found in specified context path')
    }

    const record = await context.app.service(fkServiceName).get(fkId, { user: context.params.user }, context)

    // check that at least edit role
    if (record.role == null || record.role < minRole) {
      throw new Forbidden(`You don't have the permission to ${context.method} ${context.path}.`)
    }
    return context
  }
}
