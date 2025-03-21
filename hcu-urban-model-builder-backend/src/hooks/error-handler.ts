import { GeneralError, NotAuthenticated } from '@feathersjs/errors'
import { HookContext, NextFunction } from '../declarations.js'
import { ERROR as KNEX_ERROR } from '@feathersjs/knex'

export const errorHandler = async (context: HookContext, next: NextFunction) => {
  try {
    await next()
  } catch (error: any) {
    if (!error.code || error.code >= 500) {
      if (error.name === 'TokenExpiredError') {
        const newError = new NotAuthenticated('Token expired')
        context.error = newError
        throw newError
      }

      const newError = new GeneralError()
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
