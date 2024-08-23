// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static, TSchema } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { NodesService } from './nodes.class'
import { Nullable } from '../../utils/schema'
import { NodeType } from './nodes.shared'

// Main data model schema
export const nodesSchema = Type.Object(
  {
    id: Type.Number(),
    type: Type.Enum(NodeType),
    data: Type.Object({
      label: Type.String(),
    }),
    value: Nullable(Type.Number()),
    rate: Nullable(Type.String()),
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
export const nodesDataSchema = Type.Pick(nodesSchema, ["type", 'position', 'data', 'value', 'rate'], {
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
export const nodesQueryProperties = Type.Pick(nodesSchema, ['id', 'type', "position", 'data', 'value', 'rate'])
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
