// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { BadRequest, Forbidden } from '@feathersjs/errors'
import { Roles } from '../../../client.js'
import type { HookContext } from '../../../declarations.js'

export const checkPublishPermissionsAndState = async (context: HookContext) => {
  if (Array.isArray(context?.data)) {
    throw new Error('publishMinor only works for single models')
  }
  if (context.data && 'id' in context?.data && 'modelsVersionsId' in context?.data) {
    const record = await context.app.service('models').get(context.data.id as any, {
      user: context.params.user
    })
    if (!record.role || record.role < Roles.co_owner) {
      throw new Forbidden('You need to be at least a co-owner to publish a major version')
    }
    if (record.latestDraftVersionId !== context.data.modelsVersionsId) {
      throw new BadRequest('The draft version is not the latest draft version')
    }
  } else {
    throw new BadRequest('Invalid data')
  }
}
