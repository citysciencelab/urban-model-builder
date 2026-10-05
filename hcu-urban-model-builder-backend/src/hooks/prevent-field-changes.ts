import { checkContext } from 'feathers-hooks-common'
import { BadRequest } from '@feathersjs/errors'
import _ from 'lodash'
import { STASH_BEFORE_KEY, type HookContext } from '../declarations.js'

/**
 * Rejects a patch that changes one of `fields`. The permission and version
 * state checks look at the record as it was before the patch, so a field they
 * depend on (e.g. which scenario a value belongs to) must not be moved by it.
 * Sending the unchanged value is fine, since the client sends whole records.
 */
export const preventFieldChanges = (fields: string[]) => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['patch'])

    const before = context.params[STASH_BEFORE_KEY]
    if (!before) {
      throw new Error('preventFieldChanges needs the stashed record')
    }

    for (const field of fields) {
      if (_.has(context.data, field) && !_.isEqual(context.data[field], before[field])) {
        throw new BadRequest(`${field} cannot be changed.`)
      }
    }
  }
}
