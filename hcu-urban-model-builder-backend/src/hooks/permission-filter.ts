import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.js'
import { ensureUserId } from '../utils/ensure-user-id.js'
import { isServerCall } from '../utils/is-server-call.js'
import _ from 'lodash'

export const permissionFilter = async (context: HookContext) => {
  checkContext(context, 'before', null)

  if (isServerCall(context.params)) {
    return context
  }

  // potentially throws NotAuthenticated
  ensureUserId(context)

  if (context.params.query.$me) {
    // only "my" models, i.e. created by me or shared with me, i.e. I've got a role > 0
    context.params.query.role = { $gt: 0 }
    delete context.params.query.$me
  } else if (context.params.query.$public) {
    // only public models, i.e. latestPublishedVersionId is not null
    context.params.query.latestPublishedVersionId = { $ne: null }
    delete context.params.query.$public
  } else {
    // ensure that the user gets only public and his models if $me or $public is not set
    _.set(context.params.query, '$or', [
      { userId: context.params.user._id },
      { 'roles.userId': context.params.user._id }
    ])
  }
}
