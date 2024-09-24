import { checkContext } from 'feathers-hooks-common'
import { HookContext } from '../../../declarations.js'

export const initModelDefaults = async (context: HookContext) => {
  checkContext(context, 'before', 'create')

  context.data.currentMinorVersion = 0
  context.data.currentMajorVersion = 0
  context.data.currentDraftVersion = 0

  return context
}
