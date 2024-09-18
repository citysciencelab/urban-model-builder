// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { checkContext } from 'feathers-hooks-common';
import type { HookContext } from '../declarations.js'
import { ensureUserId } from '../utils/ensure-user-id.js';

export const ensureCreatedBy = async (context: HookContext) => {

  checkContext(context, 'before', null);

  const userId = ensureUserId(context);

  // attention: this automatically throws an error with ID and createdBy does not match
  await context.service.get(context.id, {
    query: {
      createdBy: userId
    }
  });

}
