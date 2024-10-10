// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { ModelsUsersService } from './models-users.class.js'

// Main data model schema
export const modelsUsersSchema = Type.Object(
  {
    id: Type.Number(),
    userId: Type.Number(),
    modelId: Type.Number(),
    role: Type.Number() // TODO: Add role type
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
export const modelsUsersDataResolver = resolve<ModelsUsers, HookContext<ModelsUsersService>>({})

// Schema for updating existing entries
export const modelsUsersPatchSchema = Type.Partial(modelsUsersSchema, {
  $id: 'ModelsUsersPatch'
})
export type ModelsUsersPatch = Static<typeof modelsUsersPatchSchema>
export const modelsUsersPatchValidator = getValidator(modelsUsersPatchSchema, dataValidator)
export const modelsUsersPatchResolver = resolve<ModelsUsers, HookContext<ModelsUsersService>>({})

// Schema for allowed query properties
export const modelsUsersQueryProperties = Type.Pick(modelsUsersSchema, ['id', 'modelId'])
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
