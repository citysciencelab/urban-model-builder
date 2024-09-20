import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.js'
import { ensureUserId } from '../utils/ensure-user-id.js'
import { isServerCall } from '../utils/is-server-call.js'
import _ from 'lodash'

export const filterCreatedBy = async (context: HookContext) => {
  checkContext(context, 'before', null)

  if (isServerCall(context.params)) {
    return context
  }

  const userId = ensureUserId(context)

  _.set(context, 'params.query.createdBy', userId)
}
