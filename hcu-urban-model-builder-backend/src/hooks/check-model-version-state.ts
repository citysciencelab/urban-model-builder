// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.js'
import _ from 'lodash'
import { ServiceTypes } from '../client.js'
import { Forbidden } from '@feathersjs/errors'

export const checkModelVersionState = (fkIdField: string, fkServiceName: keyof ServiceTypes) => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch', 'remove'])

    // FIXME: when using stashBefore this can be removed
    if (context.method == 'remove') {
      context.data = await context.service._get(context.id, { user: context.params.user })
    }

    if (Array.isArray(context.data)) {
      throw new Error('Batch creation of nodes is not supported')
    }

    const fkId = _.get(context, fkIdField, null)
    if (!fkId) {
      throw new Error('id not found in specified context path')
    }

    const record = await context.app.service(fkServiceName).get(fkId, { user: context.params.user }, context)

    if (record.publishedAt != null) {
      throw new Forbidden('Cannot be edited because the model version is published')
    }

    if (!record.isLatest) {
      throw new Forbidden('Cannot be edited because the model version is not the latest')
    }
  }
}
