// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import { NotAuthenticated } from '@feathersjs/errors'
import type { HookContext } from '../declarations.js'
import bcrypt from 'bcryptjs'

export const adminTokenAuthenticate = async (context: HookContext) => {
  const { params } = context
  const { headers } = params

  const authHeader = headers['authorization']
  const [type, token] = authHeader?.split(' ')
  if (!token || type !== 'Bearer') {
    throw new NotAuthenticated()
  }
  const isAuthenticated = await bcrypt.compare(token, process.env.ADMIN_TOKEN as string)

  if (isAuthenticated) {
    return context
  }

  throw new NotAuthenticated()
}
