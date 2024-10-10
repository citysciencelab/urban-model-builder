// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { Roles } from '../../../client.js'
import type { HookContext } from '../../../declarations.js'

export const checkPublishPermissionsAndState = async (context: HookContext) => {
  if (Array.isArray(context?.data)) {
    throw new Error('publishMinor only works for single models')
  }
  if (context.data && 'id' in context?.data && 'modelsVersionsId' in context?.data) {
    const record = await context.service('models').get(context.data.id as any, {
      user: context.params.user
    })
    if (!record) {
      throw new Error('Model not found')
    }
    if (!record.role || record.role < Roles.co_owner) {
      throw new Error('You need to be at least a co-owner to publish a major version')
    }
    if (record.latestDraftVersionId !== context.data.modelsVersionsId) {
      throw new Error('The draft version is not the latest draft version')
    }
  } else {
    throw Error('Invalid data')
  }
}
