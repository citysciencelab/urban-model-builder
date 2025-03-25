// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { ModelsUsersService } from './models-users.class.js'
import { Roles } from '../../client.js'
import { BadRequest } from '@feathersjs/errors'

// Main data model schema
export const modelsUsersSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
    modelId: Type.String({ format: 'uuid' }),
    role: Type.Enum(Roles)
  },
  { $id: 'ModelsUsers', additionalProperties: false }
)
export type ModelsUsers = Static<typeof modelsUsersSchema>
export const modelsUsersValidator = getValidator(modelsUsersSchema, dataValidator)
export const modelsUsersResolver = resolve<ModelsUsers, HookContext<ModelsUsersService>>({})

export const modelsUsersExternalResolver = resolve<ModelsUsers, HookContext<ModelsUsersService>>({})

// Schema for creating new entries
export const modelsUsersDataSchema = Type.Pick(modelsUsersSchema, ['role', 'modelId', 'userId'], {
  $id: 'ModelsUsersData'
})
export type ModelsUsersData = Static<typeof modelsUsersDataSchema>
export const modelsUsersDataValidator = getValidator(modelsUsersDataSchema, dataValidator)
export const modelsUsersDataResolver = resolve<
  ModelsUsers & { userEmail?: string },
  HookContext<ModelsUsersService>
>({
  userId: async (value, message, context) => {
    // resolve userId from userEmail
    if (!value) {
      const users = await context.app.service('users').find({ query: { email: message.userEmail } })
      if (users.total > 0) {
        message.userId = users.data[0].id
        return users.data[0].id
      }
      throw new BadRequest('User not found')
    }
  },
  userEmail: async (_value, _message, _context) => {
    // userEmail is only temporary, remove it
    return undefined
  }
})

// Schema for updating existing entries
export const modelsUsersPatchSchema = Type.Partial(modelsUsersSchema, {
  $id: 'ModelsUsersPatch'
})
export type ModelsUsersPatch = Static<typeof modelsUsersPatchSchema>
export const modelsUsersPatchValidator = getValidator(modelsUsersPatchSchema, dataValidator)
export const modelsUsersPatchResolver = resolve<ModelsUsers, HookContext<ModelsUsersService>>({})

// Schema for allowed query properties
export const modelsUsersQueryProperties = Type.Pick(modelsUsersSchema, ['id', 'modelId', 'role', 'userId'])
export const modelsUsersQuerySchema = Type.Intersect(
  [
    querySyntax(modelsUsersQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type ModelsUsersQuery = Static<typeof modelsUsersQuerySchema>
export const modelsUsersQueryValidator = getValidator(modelsUsersQuerySchema, queryValidator)
export const modelsUsersQueryResolver = resolve<ModelsUsersQuery, HookContext<ModelsUsersService>>({})
