// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { ScenariosService } from './scenarios.class.js'
import { Nullable } from '../../utils/schema.js'

// Main data model schema
export const scenariosSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    modelsVersionsId: Type.String(),
    isDefault: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Nullable(Type.String({ format: 'date-time' })),
    deletedAt: Nullable(Type.String({ format: 'date-time' }))
  },
  { $id: 'Scenarios', additionalProperties: false }
)
export type Scenarios = Static<typeof scenariosSchema>
export const scenariosValidator = getValidator(scenariosSchema, dataValidator)
export const scenariosResolver = resolve<Scenarios, HookContext<ScenariosService>>({})

export const scenariosExternalResolver = resolve<Scenarios, HookContext<ScenariosService>>({})

// Schema for creating new entries
export const scenariosDataSchema = Type.Pick(scenariosSchema, ['name', 'modelsVersionsId', 'isDefault'], {
  $id: 'ScenariosData'
})
export type ScenariosData = Static<typeof scenariosDataSchema>
export const scenariosDataValidator = getValidator(scenariosDataSchema, dataValidator)
export const scenariosDataResolver = resolve<Scenarios, HookContext<ScenariosService>>({})

// Schema for updating existing entries
export const scenariosPatchSchema = Type.Partial(scenariosSchema, {
  $id: 'ScenariosPatch'
})
export type ScenariosPatch = Static<typeof scenariosPatchSchema>
export const scenariosPatchValidator = getValidator(scenariosPatchSchema, dataValidator)
export const scenariosPatchResolver = resolve<Scenarios, HookContext<ScenariosService>>({})

// Schema for allowed query properties
export const scenariosQueryProperties = Type.Pick(scenariosSchema, [
  'id',
  'name',
  'isDefault',
  'modelsVersionsId'
])
export const scenariosQuerySchema = Type.Intersect(
  [
    querySyntax(scenariosQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type ScenariosQuery = Static<typeof scenariosQuerySchema>
export const scenariosQueryValidator = getValidator(scenariosQuerySchema, queryValidator)
export const scenariosQueryResolver = resolve<ScenariosQuery, HookContext<ScenariosService>>({})
