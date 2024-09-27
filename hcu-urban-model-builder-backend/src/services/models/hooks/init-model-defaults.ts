import { checkContext } from 'feathers-hooks-common'
import { HookContext } from '../../../declarations.js'
import crypto from 'crypto'
import { Models } from '../models.schema.js'

export const initModelDefaults = async (context: HookContext) => {
  checkContext(context, 'before', 'create')

  context.data.currentMinorVersion = 0
  context.data.currentMajorVersion = 0
  context.data.currentDraftVersion = 1

  context.data.globalUuid = crypto.randomUUID()

  return context
}
