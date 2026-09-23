// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { SimulationResultsService } from './simulation-results.class.js'
import { Nullable } from '../../utils/schema.js'

// Main data model schema
export const simulationResultsSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    modelsVersionsId: Type.String({ format: 'uuid' }),
    scenariosId: Nullable(Type.String({ format: 'uuid' })),
    createdBy: Type.String({ format: 'uuid' }),
    name: Type.String(),
    description: Nullable(Type.String()),
    metadata: Type.Object({
      modelId: Type.String({ format: 'uuid' }),
      modelName: Type.String(),
      version: Type.String(),
      timeStart: Type.Number(),
      timeLength: Type.Number(),
      timeEnd: Type.Number(),
      downloadTimestamp: Type.String({ format: 'date-time' }),
    }),
    scenario: Type.Record(Type.String(), Type.Union([Type.Number(), Type.String(), Type.Boolean(), Type.Null()])),
    results: Type.Object({
      times: Type.Array(Type.Union([Type.Number(), Type.String()])),
      nodes: Type.Record(Type.String(), Type.Object({
        kind: Type.Optional(Type.String()),
        values: Type.Array(Type.Union([Type.Number(), Type.Null()])),
        unit: Type.Optional(Type.String()),
        lo: Type.Optional(Type.Array(Type.Union([Type.Number(), Type.Null()]))),
        hi: Type.Optional(Type.Array(Type.Union([Type.Number(), Type.Null()]))),
        ci: Type.Optional(Type.Array(Type.Union([Type.Number(), Type.Null()]))),
      })),
    }),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Nullable(Type.String({ format: 'date-time' })),
    deletedAt: Nullable(Type.String({ format: 'date-time' })),
  },
  { $id: 'SimulationResults', additionalProperties: false }
)
export type SimulationResults = Static<typeof simulationResultsSchema>
export const simulationResultsValidator = getValidator(simulationResultsSchema, dataValidator)
export const simulationResultsResolver = resolve<SimulationResults, HookContext<SimulationResultsService>>({})

export const simulationResultsExternalResolver = resolve<SimulationResults, HookContext<SimulationResultsService>>({})

// Schema for creating new entries
export const simulationResultsDataSchema = Type.Pick(
  simulationResultsSchema,
  ['modelsVersionsId', 'scenariosId', 'name', 'description', 'metadata', 'scenario', 'results'],
  {
    $id: 'SimulationResultsData',
  }
)
export type SimulationResultsData = Static<typeof simulationResultsDataSchema>
export const simulationResultsDataValidator = getValidator(simulationResultsDataSchema, dataValidator)
export const simulationResultsDataResolver = resolve<SimulationResults, HookContext<SimulationResultsService>>({})

// Schema for updating existing entries
export const simulationResultsPatchSchema = Type.Partial(simulationResultsSchema, {
  $id: 'SimulationResultsPatch',
})
export type SimulationResultsPatch = Static<typeof simulationResultsPatchSchema>
export const simulationResultsPatchValidator = getValidator(simulationResultsPatchSchema, dataValidator)
export const simulationResultsPatchResolver = resolve<SimulationResults, HookContext<SimulationResultsService>>({})

// Schema for allowed query properties
export const simulationResultsQueryProperties = Type.Pick(simulationResultsSchema, [
  'id',
  'modelsVersionsId',
  'scenariosId',
  'createdBy',
  'name',
  'createdAt',
])
export const simulationResultsQuerySchema = Type.Intersect(
  [
    querySyntax(simulationResultsQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false }),
  ],
  { additionalProperties: false }
)
export type SimulationResultsQuery = Static<typeof simulationResultsQuerySchema>
export const simulationResultsQueryValidator = getValidator(simulationResultsQuerySchema, queryValidator)
export const simulationResultsQueryResolver = resolve<SimulationResultsQuery, HookContext<SimulationResultsService>>({})
