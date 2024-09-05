// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static, TSchema } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { NodesService } from './nodes.class.js'
import { Nullable } from '../../utils/schema.js'
import { NodeType } from './nodes.shared.js'

// Main data model schema
export const nodesSchema = Type.Object(
  {
    id: Type.Number(),
    modelId: Type.Number(),
    type: Type.Enum(NodeType),
    name: Type.String(),
    data: Type.Object({
      value: Type.Optional(Type.String()),
      rate: Type.Optional(Type.String())
    }),
    position: Type.Object({
      x: Type.Number(),
      y: Type.Number()
    })
  },
  { $id: 'Nodes', additionalProperties: false }
)
export type Nodes = Static<typeof nodesSchema>
export const nodesValidator = getValidator(nodesSchema, dataValidator)
export const nodesResolver = resolve<Nodes, HookContext<NodesService>>({})

export const nodesExternalResolver = resolve<Nodes, HookContext<NodesService>>({})

// Schema for creating new entries
export const nodesDataSchema = Type.Pick(nodesSchema, ['modelId', 'type', 'name', 'position', 'data'], {
  $id: 'NodesData'
})
export type NodesData = Static<typeof nodesDataSchema>
export const nodesDataValidator = getValidator(nodesDataSchema, dataValidator)
export const nodesDataResolver = resolve<Nodes, HookContext<NodesService>>({})

// Schema for updating existing entries
export const nodesPatchSchema = Type.Partial(nodesSchema, {
  $id: 'NodesPatch'
})
export type NodesPatch = Static<typeof nodesPatchSchema>
export const nodesPatchValidator = getValidator(nodesPatchSchema, dataValidator)
export const nodesPatchResolver = resolve<Nodes, HookContext<NodesService>>({})

// Schema for allowed query properties
export const nodesQueryProperties = Type.Pick(nodesSchema, [
  'id',
  'modelId',
  'type',
  'name',
  'position',
  'data'
])
export const nodesQuerySchema = Type.Intersect(
  [
    querySyntax(nodesQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type NodesQuery = Static<typeof nodesQuerySchema>
export const nodesQueryValidator = getValidator(nodesQuerySchema, queryValidator)
export const nodesQueryResolver = resolve<NodesQuery, HookContext<NodesService>>({})
