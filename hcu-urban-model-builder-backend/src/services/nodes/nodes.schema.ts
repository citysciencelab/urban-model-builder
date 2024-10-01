// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { NetworkType, PlacementType, StockTypeType, TriggerType } from 'simulation/types'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { NodesService } from './nodes.class.js'
import { Literals, Nullable } from '../../utils/schema.js'
import { NodeType } from './nodes.shared.js'

export const variableNodeSchema = Type.Object({
  value: Type.Optional(Type.String())
})

export const stockNodeSchema = Type.Object({
  initial: Type.Optional(Type.String()),
  type: Type.Optional(Literals<StockTypeType>('Conveyor', 'Store')),
  delay: Type.Optional(Type.String()),
  nonNegative: Type.Optional(Type.Boolean())
})

export const flowNodeSchema = Type.Object({
  rate: Type.Optional(Type.String()),
  nonNegative: Type.Optional(Type.Boolean())
})

export const stateNodeSchema = Type.Object({
  startActive: Type.Optional(Type.String()),
  residency: Type.Optional(Type.String())
})

export const actionNodeSchema = Type.Object({
  value: Type.Optional(Type.String()),
  recalculate: Type.Optional(Type.Boolean()),
  repeat: Type.Optional(Type.Boolean()),
  trigger: Type.Optional(Literals<TriggerType>('Condition', 'Probability', 'Timeout')),
  action: Type.Optional(Type.String())
})

export const transitionNodeSchema = Type.Object({
  value: Type.Optional(Type.String()),
  recalculate: Type.Optional(Type.Boolean()),
  repeat: Type.Optional(Type.Boolean()),
  trigger: Type.Optional(Literals<TriggerType>('Condition', 'Probability', 'Timeout'))
})

export const populationNodeSchema = Type.Object({
  populationSize: Type.Optional(Type.Number()),
  geoUnits: Type.Optional(Type.String()),
  geoWidth: Type.Optional(Type.String()),
  geoHeight: Type.Optional(Type.String()),
  geoWrapAround: Type.Optional(Type.Boolean()),
  geoPlacementType: Type.Optional(
    Literals<PlacementType>('Custom Function', 'Ellipse', 'Grid', 'Network', 'Random')
  ),
  geoPlacementFunction: Type.Optional(Type.String()),
  networkType: Type.Optional(Literals<NetworkType>('Custom Function', 'None')),
  networkFunction: Type.Optional(Type.String())
})

// Main data model schema
export const nodesSchema = Type.Object(
  {
    id: Type.Number(),
    modelId: Type.Number(),
    type: Type.Enum(NodeType),
    name: Type.String(),
    data: Type.Intersect([
      variableNodeSchema,
      stockNodeSchema,
      flowNodeSchema,
      stateNodeSchema,
      actionNodeSchema,
      transitionNodeSchema,
      populationNodeSchema
    ]),
    position: Type.Object({
      x: Type.Number(),
      y: Type.Number()
    }),
    height: Nullable(Type.Number()),
    width: Nullable(Type.Number()),
    parentId: Nullable(Type.Number())
  },
  { $id: 'Nodes', additionalProperties: false }
)
export type Nodes = Static<typeof nodesSchema>
export const nodesValidator = getValidator(nodesSchema, dataValidator)
export const nodesResolver = resolve<Nodes, HookContext<NodesService>>({})

export const nodesExternalResolver = resolve<Nodes, HookContext<NodesService>>({})

// Schema for creating new entries
export const nodesDataSchema = Type.Pick(
  nodesSchema,
  ['modelId', 'type', 'name', 'position', 'data', 'height', 'width', 'parentId'],
  {
    $id: 'NodesData'
  }
)
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
  'data',
  'height',
  'width',
  'parentId'
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
