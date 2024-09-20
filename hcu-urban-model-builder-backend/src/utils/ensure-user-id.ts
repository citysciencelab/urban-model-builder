import { NotAuthenticated } from '@feathersjs/errors'
import { HookContext } from '../declarations.js'

export function ensureUserId(context: HookContext) {
  if (!context.params?.user?.id) {
    throw new NotAuthenticated()
  }
  return context.params.user.id
}
