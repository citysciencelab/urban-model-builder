import { checkContext } from 'feathers-hooks-common'
import { HookContext } from '../../../declarations.js'

export const initModelVersion = async (context: HookContext) => {
  checkContext(context, 'after', 'create')

  const initialVersion = await context.app.service('models-versions').create(
    {
      modelId: context.result.id,
      majorVersion: 0,
      minorVersion: 0,
      draftVersion: 0
    },
    { user: context.params.user }
  )

  await context.app.service('models').patch(context.result.id, {
    latestDraftVersionId: initialVersion.id
  })

  return context
}
