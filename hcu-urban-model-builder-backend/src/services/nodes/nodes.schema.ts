// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static, TObject, TProperties, TSchema } from '@feathersjs/typebox'
import { NetworkType, PlacementType, StockTypeType, TriggerType } from 'simulation/types'

import type { HookContext } from '../../declarations.js'
import { dataValidator, queryValidator } from '../../validators.js'
import type { NodesService } from './nodes.class.js'
import { Literals, Nullable } from '../../utils/schema.js'
import { NodeType } from './nodes.shared.js'
import { nodeDataResolver } from './resolvers/data.js'
import { ParameterTypes } from '../../client.js'

const constraintsSchema = Type.Partial(
  Type.Object({
    min: Type.Optional(Type.Number()),
    max: Type.Optional(Type.Number())
  })
)

const unitsAndConstraintsSchema = Type.Object({
  units: Type.Optional(Type.String()),
  constraints: Type.Optional(constraintsSchema)
})

const handlePositionSchema = Type.Union(
  (['left', 'top', 'right', 'bottom'] as const).map((pos) => Type.Literal(pos))
)

export const variableNodeSchema = Type.Object({
  value: Type.Optional(Type.String()),
  ...unitsAndConstraintsSchema.properties
})

export const stockNodeSchema = Type.Object({
  initial: Type.Optional(Type.String()),
  type: Type.Optional(Literals<StockTypeType>('Conveyor', 'Store')),
  delay: Type.Optional(Type.String()),
  nonNegative: Type.Optional(Type.Boolean()),
  ...unitsAndConstraintsSchema.properties
})

export const flowNodeSchema = Type.Object({
  rate: Type.Optional(Type.String()),
  nonNegative: Type.Optional(Type.Boolean()),
  direction: Type.Optional(handlePositionSchema),
  ...unitsAndConstraintsSchema.properties
})

export const converterNodeSchema = Type.Object({
  values: Type.Optional(
    Type.Array(
      Type.Object({
        x: Type.Number(),
        y: Type.Number()
      })
    )
  ),
  interpolation: Type.Optional(Type.Union([Type.Literal('Linear'), Type.Literal('Discrete')])),
  ...unitsAndConstraintsSchema.properties
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
  trigger: Type.Optional(Literals<TriggerType>('Condition', 'Probability', 'Timeout')),
  direction: Type.Optional(handlePositionSchema),
  constraints: Type.Optional(constraintsSchema)
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

export const ogcFeatureNodeSchema = Type.Object(
  {
    apiId: Type.Optional(Type.String()),
    collectionId: Type.Optional(Type.String()),
    query: Type.Optional(
      Type.Object(
        {
          limit: Type.Optional(Type.Number()),
          offset: Type.Optional(Type.Number()),
          skipGeometry: Type.Optional(Type.Boolean()),
          properties: Type.Optional(Type.Array(Type.String())),
          propertyFilters: Type.Optional(
            Type.Record(
              Type.String(),
              Type.Object({
                value: Type.String(),
                operator: Type.Optional(Type.String())
              })
            )
          )
        },
        { additionalProperties: true }
      )
    ),
    dataTransform: Type.Optional(
      Type.Object({
        keyProperty: Type.Optional(Type.String()),
        valueProperties: Type.Optional(Type.Array(Type.String()))
      })
    )
  },
  { additionalProperties: false }
)

// Main data model schema
export const nodesSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    modelsVersionsId: Type.String({ format: 'uuid' }),
    type: Type.Enum(NodeType),
    name: Nullable(Type.String()),
    description: Nullable(Type.String()),
    data: Type.Intersect([
      variableNodeSchema,
      stockNodeSchema,
      flowNodeSchema,
      converterNodeSchema,
      stateNodeSchema,
      actionNodeSchema,
      transitionNodeSchema,
      populationNodeSchema,
      ogcFeatureNodeSchema
    ]),
    position: Type.Object({
      x: Type.Number(),
      y: Type.Number()
    }),
    height: Nullable(Type.Number()),
    width: Nullable(Type.Number()),
    parentId: Nullable(Type.String({ format: 'uuid' })),
    isParameter: Type.Boolean(),
    parameterMin: Nullable(Type.Number()),
    parameterMax: Nullable(Type.Number()),
    parameterStep: Nullable(Type.Number()),
    parameterType: Nullable(Literals<ParameterTypes>('boolean', 'slider', 'select')),
    parameterOptions: Nullable(
      Type.Object({
        data: Type.Array(
          Type.Object({
            value: Type.Number(),
            label: Type.String()
          })
        )
      })
    ),
    isOutputParameter: Type.Boolean(),
    ghostParentId: Nullable(Type.String({ format: 'uuid' }))
  },
  { $id: 'Nodes', additionalProperties: false }
)
export type Nodes = Static<typeof nodesSchema>
export const nodesValidator = getValidator(nodesSchema, dataValidator)
export const nodesResolver = resolve<Nodes, HookContext<NodesService>>({
  data: nodeDataResolver
})

export const nodesExternalResolver = resolve<Nodes, HookContext<NodesService>>({})

// Schema for creating new entries
export const nodesDataSchema = Type.Pick(
  nodesSchema,
  [
    'modelsVersionsId',
    'type',
    'name',
    'description',
    'position',
    'data',
    'height',
    'width',
    'parentId',
    'isParameter',
    'isOutputParameter',
    'parameterType',
    'parameterMin',
    'parameterMax',
    'parameterStep',
    'parameterOptions',
    'isOutputParameter',
    'ghostParentId'
  ],
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
  'modelsVersionsId',
  'type',
  'name',
  'position',
  'data',
  'height',
  'width',
  'parentId',
  'ghostParentId',
  'isParameter',
  'isOutputParameter'
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
