// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { SimulateService } from './simulate.class.js'

// Main data model schema
export const simulateSchema = Type.Object(
  {

  },
  { $id: 'Simulate', additionalProperties: false }
)
export type Simulate = Static<typeof simulateSchema>
export const simulateValidator = getValidator(simulateSchema, dataValidator)
export const simulateResolver = resolve<Simulate, HookContext<SimulateService>>({})

export const simulateExternalResolver = resolve<Simulate, HookContext<SimulateService>>({})

// Schema for creating new entries
export const simulateDataSchema = Type.Pick(simulateSchema, [], {
  $id: 'SimulateData'
})
export type SimulateData = Static<typeof simulateDataSchema>
export const simulateDataValidator = getValidator(simulateDataSchema, dataValidator)
export const simulateDataResolver = resolve<Simulate, HookContext<SimulateService>>({})

// Schema for updating existing entries
export const simulatePatchSchema = Type.Partial(simulateSchema, {
  $id: 'SimulatePatch'
})
export type SimulatePatch = Static<typeof simulatePatchSchema>
export const simulatePatchValidator = getValidator(simulatePatchSchema, dataValidator)
export const simulatePatchResolver = resolve<Simulate, HookContext<SimulateService>>({})

// Schema for allowed query properties
export const simulateQueryProperties = Type.Pick(simulateSchema, [])
export const simulateQuerySchema = Type.Intersect(
  [
    querySyntax(simulateQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type SimulateQuery = Static<typeof simulateQuerySchema>
export const simulateQueryValidator = getValidator(simulateQuerySchema, queryValidator)
export const simulateQueryResolver = resolve<SimulateQuery, HookContext<SimulateService>>({})
