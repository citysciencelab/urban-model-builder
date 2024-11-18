// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../../declarations.js'
import { dataValidator, queryValidator } from '../../../validators.js'
import type { JobsService } from './jobs.class.js'

// Main data model schema
export const jobsSchema = Type.Object(
  {
    id: Type.Number(),
    text: Type.String()
  },
  { $id: 'Jobs', additionalProperties: false }
)
export type Jobs = Static<typeof jobsSchema>
export const jobsValidator = getValidator(jobsSchema, dataValidator)
export const jobsResolver = resolve<Jobs, HookContext<JobsService>>({})

export const jobsExternalResolver = resolve<Jobs, HookContext<JobsService>>({})

// Schema for allowed query properties
export const jobsQueryProperties = Type.Pick(jobsSchema, ['id', 'text'])
export const jobsQuerySchema = Type.Intersect(
  [
    querySyntax(jobsQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type JobsQuery = Static<typeof jobsQuerySchema>
export const jobsQueryValidator = getValidator(jobsQuerySchema, queryValidator)
export const jobsQueryResolver = resolve<JobsQuery, HookContext<JobsService>>({})
