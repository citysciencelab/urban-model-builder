// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { ModelsVersionsService } from './models-versions.class.js'
import { AlgorithmType } from 'simulation'
import { Literals, Nullable } from '../../utils/schema.js'

// Main data model schema
export const modelsVersionsSchema = Type.Object(
  {
    id: Type.Number(),
    modelId: Type.Number(),
    parentId: Nullable(Type.Number()),
    majorVersion: Type.Number(),
    minorVersion: Type.Number(),
    draftVersion: Type.Number(),
    notes: Type.String(),
    timeUnits: Type.Optional(Literals('Seconds', 'Minutes', 'Hours', 'Days', 'Weeks', 'Months', 'Years')),
    timeStart: Type.Optional(Type.Number()),
    timeLength: Type.Optional(Type.Number()),
    timeStep: Type.Optional(Type.Number()),
    algorithm: Type.Optional(Literals<AlgorithmType>('Euler', 'RK4')),
    globals: Type.Optional(Type.String()),
    createdBy: Type.Optional(Type.Number()),
    publishedBy: Type.Optional(Type.Number()),
    publishedAt: Type.String({ format: 'date-time' }),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
    deletedAt: Nullable(Type.String({ format: 'date-time' }))
  },
  { $id: 'ModelsVersions', additionalProperties: false }
)
export type ModelsVersions = Static<typeof modelsVersionsSchema>
export const modelsVersionsValidator = getValidator(modelsVersionsSchema, dataValidator)
export const modelsVersionsResolver = resolve<ModelsVersions, HookContext<ModelsVersionsService>>({})

export const modelsVersionsExternalResolver = resolve<ModelsVersions, HookContext<ModelsVersionsService>>({})

// Schema for creating new entries
export const modelsVersionsDataSchema = Type.Pick(
  modelsVersionsSchema,
  ['notes', 'timeUnits', 'timeStart', 'timeLength', 'algorithm', 'globals'],
  {
    $id: 'ModelsVersionsData'
  }
)
export type ModelsVersionsData = Static<typeof modelsVersionsDataSchema>
export const modelsVersionsDataValidator = getValidator(modelsVersionsDataSchema, dataValidator)
export const modelsVersionsDataResolver = resolve<ModelsVersions, HookContext<ModelsVersionsService>>({})

// Schema for updating existing entries
export const modelsVersionsPatchSchema = Type.Partial(modelsVersionsSchema, {
  $id: 'ModelsVersionsPatch'
})
export type ModelsVersionsPatch = Static<typeof modelsVersionsPatchSchema>
export const modelsVersionsPatchValidator = getValidator(modelsVersionsPatchSchema, dataValidator)
export const modelsVersionsPatchResolver = resolve<ModelsVersions, HookContext<ModelsVersionsService>>({})

// Schema for allowed query properties
export const modelsVersionsQueryProperties = Type.Pick(modelsVersionsSchema, [
  'id',
  'notes',
  'timeUnits',
  'timeStart',
  'timeLength',
  'algorithm',
  'globals'
])
export const modelsVersionsQuerySchema = Type.Intersect(
  [
    querySyntax(modelsVersionsQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type ModelsVersionsQuery = Static<typeof modelsVersionsQuerySchema>
export const modelsVersionsQueryValidator = getValidator(modelsVersionsQuerySchema, queryValidator)
export const modelsVersionsQueryResolver = resolve<ModelsVersionsQuery, HookContext<ModelsVersionsService>>(
  {}
)
