// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../../declarations.js'
import { dataValidator, queryValidator } from '../../../validators.js'
import type { ProcessesService } from './processes.class.js'

// Main data model schema
export const processesSchema = Type.Object(
  {
    id: Type.Number(),
    text: Type.String()
  },
  { $id: 'Processes', additionalProperties: false }
)
export type Processes = Static<typeof processesSchema>
export const processesValidator = getValidator(processesSchema, dataValidator)
export const processesResolver = resolve<Processes, HookContext<ProcessesService>>({})

export const processesExternalResolver = resolve<Processes, HookContext<ProcessesService>>({})

// Schema for allowed query properties
export const processesQueryProperties = Type.Pick(processesSchema, ['id', 'text'])
export const processesQuerySchema = Type.Intersect(
  [
    querySyntax(processesQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type ProcessesQuery = Static<typeof processesQuerySchema>
export const processesQueryValidator = getValidator(processesQuerySchema, queryValidator)
export const processesQueryResolver = resolve<ProcessesQuery, HookContext<ProcessesService>>({})
