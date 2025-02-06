// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { ModelsService } from './models.class.js'
import { Nullable } from '../../utils/schema.js'

// Main data model schema
export const modelsSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    internalName: Type.String(),
    publicName: Type.String(),
    description: Type.Optional(Type.String()),
    latestPublishedVersionId: Nullable(Type.String({ format: 'uuid' })),
    latestDraftVersionId: Nullable(Type.String()),
    currentMinorVersion: Type.Number(),
    currentMajorVersion: Type.Number(),
    currentDraftVersion: Type.Number(),
    globalUuid: Nullable(Type.String()),
    forkedFromVersionId: Nullable(Type.String({ format: 'uuid' })),
    createdBy: Type.Optional(Type.String({ format: 'uuid' })),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Nullable(Type.String({ format: 'date-time' })),
    deletedAt: Nullable(Type.String({ format: 'date-time' })),
    role: Nullable(Type.Number())
  },
  { $id: 'Models', additionalProperties: false }
)
export type Models = Static<typeof modelsSchema>
export const modelsValidator = getValidator(modelsSchema, dataValidator)
export const modelsResolver = resolve<Models, HookContext<ModelsService>>({})

export const modelsExternalResolver = resolve<Models, HookContext<ModelsService>>({})

// Schema for creating new entries
export const modelsDataSchema = Type.Pick(
  modelsSchema,
  ['internalName', 'description', 'globalUuid', 'forkedFromVersionId', 'createdBy', 'updatedAt'],
  {
    $id: 'ModelsData'
  }
)
export type ModelsData = Static<typeof modelsDataSchema>
export const modelsDataValidator = getValidator(modelsDataSchema, dataValidator)
export const modelsDataResolver = resolve<Models, HookContext<ModelsService>>({})

// Schema for updating existing entries
export const modelsPatchSchema = Type.Partial(modelsSchema, {
  $id: 'ModelsPatch'
})
export type ModelsPatch = Static<typeof modelsPatchSchema>
export const modelsPatchValidator = getValidator(modelsPatchSchema, dataValidator)
export const modelsPatchResolver = resolve<Models, HookContext<ModelsService>>({})

// Schema for allowed query properties
export const modelsQueryProperties = Type.Pick(modelsSchema, [
  'id',
  'internalName',
  'globalUuid',
  'forkedFromVersionId',
  'createdAt',
  'deletedAt',
  'updatedAt',
  'createdBy',
  'role'
])
export const modelsQuerySchema = Type.Intersect(
  [
    querySyntax(modelsQueryProperties, {
      internalName: {
        $ilike: Type.String()
      }
    }),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type ModelsQuery = Static<typeof modelsQuerySchema>
export const modelsQueryValidator = getValidator(modelsQuerySchema, queryValidator)
export const modelsQueryResolver = resolve<ModelsQuery, HookContext<ModelsService>>({})

// Schema for custom method: simulate
export const modelsSimulateSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    nodeIdToParameterValueMap: Type.Optional(Type.Record(Type.String(), Type.Number()))
  },
  { $id: 'ModelsSimulate', additionalProperties: false }
)
export type ModelsSimulate = Static<typeof modelsSimulateSchema>
export const modelsSimulateValidator = getValidator(modelsSimulateSchema, dataValidator)
export const modelsSimulateResolver = resolve<ModelsSimulate, HookContext<ModelsService>>({})

// Schema for custom method: newDraft
export const modelsNewDraftSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' })
  },
  { $id: 'ModelsNewDraft', additionalProperties: false }
)
export type ModelsNewDraft = Static<typeof modelsNewDraftSchema>
export const modelsNewDraftSimulateValidator = getValidator(modelsNewDraftSchema, dataValidator)
export const modelsNewDraftSimulateResolver = resolve<ModelsNewDraft, HookContext<ModelsService>>({})

// Schema for custom method: publishMinor
export const modelsPublishSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    notes: Type.String(),
    modelsVersionsId: Type.String({ format: 'uuid' })
  },
  { $id: 'ModelsPublish', additionalProperties: false }
)
export type ModelsPublish = Static<typeof modelsPublishSchema>
export const modelsPublishValidator = getValidator(modelsPublishSchema, dataValidator)
export const modelsPublishResolver = resolve<ModelsPublish, HookContext<ModelsService>>({})

// Schema for custom method: cloneVersion
export const modelsCloneVersionSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    internalName: Type.String()
  },
  { $id: 'ModelsCloneVersion', additionalProperties: false }
)
export type ModelsCloneVersion = Static<typeof modelsCloneVersionSchema>
export const modelsCloneVersionValidator = getValidator(modelsCloneVersionSchema, dataValidator)
export const modelsCloneVersionResolver = resolve<ModelsCloneVersion, HookContext<ModelsService>>({})
