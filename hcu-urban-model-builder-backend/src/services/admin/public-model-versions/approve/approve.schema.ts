// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../../../declarations.js'
import { dataValidator, queryValidator } from '../../../../validators.js'
import type { AdminPublicModelVersionsApproveService } from './approve.class.js'
import { modelsVersionsSchema } from '../../../models-versions/models-versions.schema.js'

// Main data model schema
export const adminPublicModelVersionsApproveSchema = Type.Omit(modelsVersionsSchema, [], {
  $id: 'AdminPublicModelVersionsApprove',
  additionalProperties: false
})
export type AdminPublicModelVersionsApprove = Static<typeof adminPublicModelVersionsApproveSchema>
export const adminPublicModelVersionsApproveValidator = getValidator(
  adminPublicModelVersionsApproveSchema,
  dataValidator
)
export const adminPublicModelVersionsApproveResolver = resolve<
  AdminPublicModelVersionsApprove,
  HookContext<AdminPublicModelVersionsApproveService>
>({})

export const adminPublicModelVersionsApproveExternalResolver = resolve<
  AdminPublicModelVersionsApprove,
  HookContext<AdminPublicModelVersionsApproveService>
>({})

// Schema for updating existing entries
export const adminPublicModelVersionsApprovePatchSchema = Type.Object(
  {},
  {
    $id: 'AdminPublicModelVersionsApprovePatch'
  }
)
export type AdminPublicModelVersionsApprovePatch = Static<typeof adminPublicModelVersionsApprovePatchSchema>
export const adminPublicModelVersionsApprovePatchValidator = getValidator(
  adminPublicModelVersionsApprovePatchSchema,
  dataValidator
)
export const adminPublicModelVersionsApprovePatchResolver = resolve<
  AdminPublicModelVersionsApprove,
  HookContext<AdminPublicModelVersionsApproveService>
>({})

// Schema for allowed query properties
export const adminPublicModelVersionsApproveQueryProperties = Type.Pick(
  adminPublicModelVersionsApproveSchema,
  []
)
export const adminPublicModelVersionsApproveQuerySchema = Type.Intersect(
  [
    querySyntax(adminPublicModelVersionsApproveQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type AdminPublicModelVersionsApproveQuery = Static<typeof adminPublicModelVersionsApproveQuerySchema>
export const adminPublicModelVersionsApproveQueryValidator = getValidator(
  adminPublicModelVersionsApproveQuerySchema,
  queryValidator
)
export const adminPublicModelVersionsApproveQueryResolver = resolve<
  AdminPublicModelVersionsApproveQuery,
  HookContext<AdminPublicModelVersionsApproveService>
>({})
