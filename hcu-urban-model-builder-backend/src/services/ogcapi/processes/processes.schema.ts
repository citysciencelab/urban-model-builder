// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../../declarations.js'
import { dataValidator } from '../../../validators.js'
import type { ProcessesService } from './processes.class.js'

// Main data model schema
const processSchema = {
  id: Type.Number(),
  title: Type.String(),
  description: Type.String(),
  version: Type.String(),
  links: Type.Array(
    Type.Object({
      href: Type.String()
    })
  )
}
export const processesSchema = Type.Object(
  {
    processes: Type.Array(Type.Object(processSchema)),
    links: Type.Array(Type.Object({ href: Type.String() }))
  },
  { $id: 'Processes', additionalProperties: false }
)
export const processesDetailSchema = Type.Object(
  {
    ...processSchema,
    inputs: Type.Any(),
    links: Type.Any()
  },
  { $id: 'ProcessesDetail', additionalProperties: false }
)

export type Processes = Static<typeof processesSchema>
export type ProcessesDetails = Static<typeof processesDetailSchema>
export const processesValidator = getValidator(processesSchema, dataValidator)
export const processesResolver = resolve<Processes, HookContext<ProcessesService>>({})

export const processesExternalResolver = resolve<Processes, HookContext<ProcessesService>>({})
