import { GeneralError } from '@feathersjs/errors'
import { HookContext, NextFunction } from '../declarations.js'
import { ERROR as KNEX_ERROR } from '@feathersjs/knex'

export const errorHandler = async (context: HookContext, next: NextFunction) => {
  try {
    await next()
  } catch (error: any) {
    if (!error.code || error.code >= 500) {
      const newError = new GeneralError('server error')
      context.error = newError
      throw newError
    }

    if (error.code === 404 || process.env.NODE_ENV === 'production') {
      error.stack = null

      if (KNEX_ERROR in error) {
        delete error.message
        if (error.code === 404 && context.id) {
          error.message = `No record found for id '${context.id}'`
        }
      }
    }
    throw error
  }
}
