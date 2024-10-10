// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.ts'
import { Roles, ServiceTypes } from '../client.js'
import _ from 'lodash'

export const checkModelPermission = (idField: string, fkServiceName: keyof ServiceTypes, minRole: Roles) => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch', 'remove'])

    if (context.method == 'remove') {
      // TODO: discuss possible side effects of this
      context.data = await context.service._get(context.id, { user: context.params.user })
    }

    if (Array.isArray(context.data)) {
      throw new Error('Batch creation of nodes is not supported')
    }

    const id = _.get(context, idField, null)

    if (!id) {
      throw new Error('id not found in specified context path')
    }

    const record = await context.app.service(fkServiceName).get(id, { user: context.params.user }, context)

    // check that at least edit role
    if (record.role == null || record.role < minRole) {
      throw new Error("You don't have the permission to create nodes for this model")
    }
    return context
  }
}
