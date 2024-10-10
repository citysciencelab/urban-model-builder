// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { Roles } from '../../../client.js'
import type { HookContext } from '../../../declarations.js'

export const checkClonePermissionsAndState = async (context: HookContext) => {
  if (Array.isArray(context.data)) {
    throw new Error('New Drafts only works for single models')
  }

  if (context.data && 'id' in context.data) {
    try {
      const record = await context.app.service('models-versions').get(context.data.id, {
        user: context.params.user
      })

      if (!record) {
        throw new Error('ModelVersion not found')
      }

      if (!record.publishedAt && (!record.role || record.role < Roles.viewer)) {
        throw new Error('You need to be at least a viewer to clone a model')
      }
    } catch (error: any) {
      throw new Error(`Error fetching model: ${error.message}`)
    }
  } else {
    throw new Error('Invalid data: id is missing')
  }
}
