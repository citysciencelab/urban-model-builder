// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.ts'
import { Roles, ServiceTypes } from '../client.js'
import _ from 'lodash'
import { Forbidden } from '@feathersjs/errors'

export const checkModelPermission = (
  fkIdField: string,
  fkServiceName: keyof ServiceTypes,
  minRole: Roles
) => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch', 'remove'])

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
