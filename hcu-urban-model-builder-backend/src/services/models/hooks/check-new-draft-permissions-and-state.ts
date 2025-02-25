// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { BadRequest, Forbidden } from '@feathersjs/errors'
import { Roles } from '../../../client.js'
import type { HookContext } from '../../../declarations.js'

export const checkNewDraftPermissionsAndState = async (context: HookContext) => {
  if (Array.isArray(context.data)) {
    throw new Error('New Drafts only works for single models')
  }

  if (context.data && 'id' in context.data) {
    const record = await context.app.service('models').get(context.data.id, {
      user: context.params.user
    })
    if (!record.role || record.role < Roles.collaborator) {
      throw new Forbidden('You need to be at least a collaborator to clone a model')
    }
  } else {
    throw new BadRequest('Invalid data: id is missing')
  }
}
