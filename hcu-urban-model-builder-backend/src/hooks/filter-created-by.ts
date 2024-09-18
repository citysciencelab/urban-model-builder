import { checkContext } from 'feathers-hooks-common';
import type { HookContext } from '../declarations.js'
import { ensureUserId } from '../utils/ensure-user-id.js';

export const filterCreatedBy = async (context: HookContext) => {

  checkContext(context, 'before', null);

  const userId = ensureUserId(context);

  context.params.query = {
    ...context.params.query,
    createdBy: userId
  }
}
