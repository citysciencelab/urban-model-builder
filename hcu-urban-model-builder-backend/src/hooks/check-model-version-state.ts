// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common'
import type { HookContext } from '../declarations.js'

export const checkModelVersionState = () => {
  return async (context: HookContext) => {
    checkContext(context, 'before', ['create', 'patch'])

    if (Array.isArray(context.data)) {
      throw new Error('Batch creation of nodes is not supported')
    }

    if (!context?.data.modelsVersionsId) {
      throw new Error('modelsVersionsId is required and must be a number')
    }

    const record = await context.app
      .service('models-versions')
      .get(context.data.modelsVersionsId, { user: context.params.user })

    if (record.publishedAt != null) {
      throw new Error('Cannot be edited because the model version is published')
    }

    if (!record.isLatest) {
      throw new Error('Cannot be edited because the model version is not the latest')
    }
  }
}
