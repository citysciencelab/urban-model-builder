// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { EdgesService } from './edges.class'

// Main data model schema
export const edgesSchema = Type.Object(
  {
    id: Type.Number(),
    sourceId: Type.Number(),
    targetId: Type.Number(),
    sourceHandle: Type.String(),
    targetHandle: Type.String(),
  },
  { $id: 'Edges', additionalProperties: false }
)
export type Edges = Static<typeof edgesSchema>
export const edgesValidator = getValidator(edgesSchema, dataValidator)
export const edgesResolver = resolve<Edges, HookContext<EdgesService>>({})

export const edgesExternalResolver = resolve<Edges, HookContext<EdgesService>>({})

// Schema for creating new entries
export const edgesDataSchema = Type.Pick(edgesSchema, ['sourceId', 'targetId', 'sourceHandle', 'targetHandle'], {
  $id: 'EdgesData'
})
export type EdgesData = Static<typeof edgesDataSchema>
export const edgesDataValidator = getValidator(edgesDataSchema, dataValidator)
export const edgesDataResolver = resolve<Edges, HookContext<EdgesService>>({})

// Schema for updating existing entries
export const edgesPatchSchema = Type.Partial(edgesSchema, {
  $id: 'EdgesPatch'
})
export type EdgesPatch = Static<typeof edgesPatchSchema>
export const edgesPatchValidator = getValidator(edgesPatchSchema, dataValidator)
export const edgesPatchResolver = resolve<Edges, HookContext<EdgesService>>({})

// Schema for allowed query properties
export const edgesQueryProperties = Type.Pick(edgesSchema, ['id', 'sourceId', 'targetId', 'sourceHandle', 'targetHandle'])
export const edgesQuerySchema = Type.Intersect(
  [
    querySyntax(edgesQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type EdgesQuery = Static<typeof edgesQuerySchema>
export const edgesQueryValidator = getValidator(edgesQuerySchema, queryValidator)
export const edgesQueryResolver = resolve<EdgesQuery, HookContext<EdgesService>>({})
