// For more information about this file see https://dove.feathersjs.com/guides/cli/log-error.html
import { log } from 'console'
import type { HookContext, NextFunction } from '../declarations.js'
import { logger } from '../logger.js'

export const logError = async (context: HookContext, next: NextFunction) => {
  try {
    logger.debug(`BEFORE ${context.path}.${context.method}()`)
    await next()
    logger.debug(`AFTER ${context.path}.${context.method}()`)
  } catch (error: any) {
    logger.error(`ERROR ${context.path}.${context.method}()`)
    logger.error(error.stack)

    // Log validation errors
    if (error.data) {
      logger.error('Data: %O', error.data)
    }

    throw error
  }
}
