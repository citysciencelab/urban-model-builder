// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.ts'
import { Roles, ServiceTypes } from '../client.js'

type fieldNames = 'modelId' | 'modelsVersionsId'

export const checkModelPermission = (
  fkFieldName: fieldNames,
  fkServiceName: keyof ServiceTypes,
  minRole: Roles
) => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch'])

    if (Array.isArray(context.data)) {
      throw new Error('Batch creation of nodes is not supported')
    }

    if (!context?.data[fkFieldName]) {
      throw new Error('modelsVersionsId is required and must be a number')
    }
    const record = await context.app
      .service(fkServiceName)
      .get(context.data[fkFieldName], { user: context.params.user }, context)

    // check that at least edit role
    if (record.role == null || record.role < minRole) {
      throw new Error("You don't have the permission to create nodes for this model")
    }
    return context
  }
}
