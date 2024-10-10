// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.js'
import _ from 'lodash'
import { ServiceTypes } from '../client.js'

export const checkModelVersionState = (idField: string, fkServiceName: keyof ServiceTypes) => {
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

    if (record.publishedAt != null) {
      throw new Error('Cannot be edited because the model version is published')
    }

    if (!record.isLatest) {
      throw new Error('Cannot be edited because the model version is not the latest')
    }
  }
}
