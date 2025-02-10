// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { ScenarioValuesService } from './scenarios-values.class.js'
import { Nullable } from '../../utils/schema.js'

// Main data model schema
export const scenarioValuesSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    value: Type.Number(),
    nodesId: Type.String({ format: 'uuid' }),
    scenariosId: Type.String({ format: 'uuid' }),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Nullable(Type.String({ format: 'date-time' })),
    deletedAt: Nullable(Type.String({ format: 'date-time' }))
  },
  { $id: 'ScenarioValues', additionalProperties: false }
)
export type ScenarioValues = Static<typeof scenarioValuesSchema>
export const scenarioValuesValidator = getValidator(scenarioValuesSchema, dataValidator)
export const scenarioValuesResolver = resolve<ScenarioValues, HookContext<ScenarioValuesService>>({})

export const scenarioValuesExternalResolver = resolve<ScenarioValues, HookContext<ScenarioValuesService>>({})

// Schema for creating new entries
export const scenarioValuesDataSchema = Type.Pick(scenarioValuesSchema, ['value', 'nodesId', 'scenariosId'], {
  $id: 'ScenarioValuesData'
})
export type ScenarioValuesData = Static<typeof scenarioValuesDataSchema>
export const scenarioValuesDataValidator = getValidator(scenarioValuesDataSchema, dataValidator)
export const scenarioValuesDataResolver = resolve<ScenarioValues, HookContext<ScenarioValuesService>>({})

// Schema for updating existing entries
export const scenarioValuesPatchSchema = Type.Partial(scenarioValuesSchema, {
  $id: 'ScenarioValuesPatch'
})
export type ScenarioValuesPatch = Static<typeof scenarioValuesPatchSchema>
export const scenarioValuesPatchValidator = getValidator(scenarioValuesPatchSchema, dataValidator)
export const scenarioValuesPatchResolver = resolve<ScenarioValues, HookContext<ScenarioValuesService>>({})

// Schema for allowed query properties
export const scenarioValuesQueryProperties = Type.Pick(scenarioValuesSchema, [
  'id',
  'value',
  'scenariosId',
  'nodesId'
])
export const scenarioValuesQuerySchema = Type.Intersect(
  [
    querySyntax(scenarioValuesQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type ScenarioValuesQuery = Static<typeof scenarioValuesQuerySchema>
export const scenarioValuesQueryValidator = getValidator(scenarioValuesQuerySchema, queryValidator)
export const scenarioValuesQueryResolver = resolve<ScenarioValuesQuery, HookContext<ScenarioValuesService>>(
  {}
)
