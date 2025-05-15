// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../../../declarations.js'
import { dataValidator, queryValidator } from '../../../../validators.js'
import type { AdminPublicModelVersionsUnapproveService } from './unapprove.class.js'
import { modelsVersionsSchema } from '../../../models-versions/models-versions.schema.js'

// Main data model schema
export const adminPublicModelVersionsUnapproveSchema = Type.Omit(modelsVersionsSchema, [], {
  $id: 'AdminPublicModelVersionsUnapprove',
  additionalProperties: false
})
export type AdminPublicModelVersionsUnapprove = Static<typeof adminPublicModelVersionsUnapproveSchema>
export const adminPublicModelVersionsUnapproveValidator = getValidator(
  adminPublicModelVersionsUnapproveSchema,
  dataValidator
)
export const adminPublicModelVersionsUnapproveResolver = resolve<
  AdminPublicModelVersionsUnapprove,
  HookContext<AdminPublicModelVersionsUnapproveService>
>({})

export const adminPublicModelVersionsUnapproveExternalResolver = resolve<
  AdminPublicModelVersionsUnapprove,
  HookContext<AdminPublicModelVersionsUnapproveService>
>({})

// Schema for updating existing entries
export const adminPublicModelVersionsUnapprovePatchSchema = Type.Object(
  {},
  {
    $id: 'AdminPublicModelVersionsUnapprovePatch'
  }
)
export type AdminPublicModelVersionsUnapprovePatch = Static<
  typeof adminPublicModelVersionsUnapprovePatchSchema
>
export const adminPublicModelVersionsUnapprovePatchValidator = getValidator(
  adminPublicModelVersionsUnapprovePatchSchema,
  dataValidator
)
export const adminPublicModelVersionsUnapprovePatchResolver = resolve<
  AdminPublicModelVersionsUnapprove,
  HookContext<AdminPublicModelVersionsUnapproveService>
>({})

// Schema for allowed query properties
export const adminPublicModelVersionsUnapproveQueryProperties = Type.Pick(
  adminPublicModelVersionsUnapproveSchema,
  []
)
export const adminPublicModelVersionsUnapproveQuerySchema = Type.Intersect(
  [
    querySyntax(adminPublicModelVersionsUnapproveQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type AdminPublicModelVersionsUnapproveQuery = Static<
  typeof adminPublicModelVersionsUnapproveQuerySchema
>
export const adminPublicModelVersionsUnapproveQueryValidator = getValidator(
  adminPublicModelVersionsUnapproveQuerySchema,
  queryValidator
)
export const adminPublicModelVersionsUnapproveQueryResolver = resolve<
  AdminPublicModelVersionsUnapproveQuery,
  HookContext<AdminPublicModelVersionsUnapproveService>
>({})
