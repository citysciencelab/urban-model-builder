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
    id: Type.String(),
    modelId: Type.String({ format: 'uuid' }),
    parentId: Nullable(Type.String({ format: 'uuid' })),
    majorVersion: Type.Number(),
    minorVersion: Type.Number(),
    draftVersion: Type.Number(),
    notes: Nullable(Type.String()),
    timeUnits: Nullable(Literals('Seconds', 'Minutes', 'Hours', 'Days', 'Weeks', 'Months', 'Years')),
    timeStart: Nullable(Type.Number()),
    timeLength: Nullable(Type.Number()),
    timeStep: Nullable(Type.Number()),
    isLatest: Nullable(Type.Boolean()),
    algorithm: Nullable(Literals<AlgorithmType>('Euler', 'RK4')),
    globals: Nullable(Type.String()),
    customUnits: Nullable(Type.Object({ data: Type.Record(Type.String(), Type.Array(Type.Number())) })),
    createdBy: Nullable(Type.String({ format: 'uuid' })),
    publishedBy: Nullable(Type.String({ format: 'uuid' })),
    publishedAt: Type.String({ format: 'date-time' }),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Nullable(Type.String({ format: 'date-time' })),
    deletedAt: Nullable(Type.String({ format: 'date-time' })),
    role: Nullable(Type.Number()),
    publishedToUMPAt: Nullable(Type.String({ format: 'date-time' })),
    publishedToUMPApprovedAt: Nullable(Type.String({ format: 'date-time' }))
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
  [
    'modelId',
    'parentId',
    'createdBy',
    'updatedAt',
    'majorVersion',
    'minorVersion',
    'draftVersion',
    'isLatest',
    'notes',
    'timeUnits',
    'timeStart',
    'timeLength',
    'timeStep',
    'algorithm',
    'globals',
    'publishedToUMPAt'
  ],
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
  'modelId',
  'notes',
  'timeUnits',
  'timeStart',
  'timeLength',
  'algorithm',
  'globals',
  'createdAt',
  'publishedToUMPAt'
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

export const modelsVersionsJoinChannelDataSchema = Type.Pick(modelsVersionsSchema, ['id'], {
  $id: 'ModelsVersionsJoinChannelData'
})
export type ModelsVersionsJoinChannelData = Static<typeof modelsVersionsJoinChannelDataSchema>
export const modelsVersionsJoinChannelDataValidator = getValidator(
  modelsVersionsJoinChannelDataSchema,
  dataValidator
)

export const modelsVersionsLeaveChannelDataSchema = Type.Pick(modelsVersionsSchema, ['id'], {
  $id: 'ModelsVersionsLeaveChannelData'
})
export type ModelsVersionsLeaveChannelData = Static<typeof modelsVersionsLeaveChannelDataSchema>
export const modelsVersionsLeaveChannelDataValidator = getValidator(
  modelsVersionsLeaveChannelDataSchema,
  dataValidator
)
