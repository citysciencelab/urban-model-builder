import { BadRequest } from '@feathersjs/errors'
import type { HookContext } from '../declarations.js'
import { ensureUserId } from '../utils/ensure-user-id.js'
import { checkContext, getItems, replaceItems } from 'feathers-hooks-common'
import { isServerCall } from '../utils/is-server-call.js'

export const setCreatedBy = async (context: HookContext) => {
  checkContext(context, 'before', null)

  if (isServerCall(context.params)) {
    return context
  }

  const userId = ensureUserId(context)

  const items = getItems(context)

  if (Array.isArray(items)) {
    items.map((item) => {
      item.createdBy = userId
    })
  } else if (items) {
    items.createdBy = userId
  } else {
    throw new BadRequest()
  }

  replaceItems(context, items)

  return context
}
