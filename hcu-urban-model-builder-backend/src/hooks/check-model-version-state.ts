// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext, ServiceNamesWithGet } from '../declarations.js'
import _ from 'lodash'
import { Forbidden } from '@feathersjs/errors'
import { isServerCall } from '../utils/is-server-call.js'

export const checkModelVersionState = (fkIdField: string, fkServiceName: ServiceNamesWithGet) => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch', 'remove'])

    // Internal server-originated calls (e.g. importModel delegating to
    // importVersion for a non-latest/published historical version) aren't
    // subject to the "must be the latest, unpublished draft" restriction that
    // exists to protect a real user's in-progress edits.
    if (isServerCall(context.params) && !context.params?.user) {
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

    if (record.publishedAt != null) {
      throw new Forbidden('Cannot be edited because the model version is published')
    }

    if (!record.isLatest) {
      throw new Forbidden('Cannot be edited because the model version is not the latest')
    }
  }
}
