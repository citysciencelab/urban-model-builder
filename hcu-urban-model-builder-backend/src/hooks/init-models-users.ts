// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import { Roles } from '../client.js'
import type { HookContext } from '../declarations.js'

export const initModelsUsers = async (context: HookContext) => {
  checkContext(context, 'after', ['create'])

  await context.app.service('models-users').create({
    modelId: context.result.id,
    userId: context.params.user.id,
    role: Roles.owner
  })
}
