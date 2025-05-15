// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../../declarations.js'
import { dataValidator, queryValidator } from '../../../validators.js'
import type { AdminPublicModelVersionsService } from './public-model-versions.class.js'
import { modelsVersionsSchema } from '../../models-versions/models-versions.schema.js'

// Main data model schema
export const adminPublicModelVersionsSchema = Type.Omit(modelsVersionsSchema, [], {
  $id: 'AdminPublicModelVersions',
  additionalProperties: false
})
export type AdminPublicModelVersions = Static<typeof adminPublicModelVersionsSchema>
export const adminPublicModelVersionsValidator = getValidator(adminPublicModelVersionsSchema, dataValidator)
export const adminPublicModelVersionsResolver = resolve<
  AdminPublicModelVersions,
  HookContext<AdminPublicModelVersionsService>
>({})

export const adminPublicModelVersionsExternalResolver = resolve<
  AdminPublicModelVersions,
  HookContext<AdminPublicModelVersionsService>
>({})

// Schema for allowed query properties
export const adminPublicModelVersionsQueryProperties = Type.Pick(adminPublicModelVersionsSchema, [
  'publishedToUMPApprovedAt'
])
export const adminPublicModelVersionsQuerySchema = Type.Intersect(
  [
    querySyntax(adminPublicModelVersionsQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type AdminPublicModelVersionsQuery = Static<typeof adminPublicModelVersionsQuerySchema>
export const adminPublicModelVersionsQueryValidator = getValidator(
  adminPublicModelVersionsQuerySchema,
  queryValidator
)
export const adminPublicModelVersionsQueryResolver = resolve<
  AdminPublicModelVersionsQuery,
  HookContext<AdminPublicModelVersionsService>
>({})
