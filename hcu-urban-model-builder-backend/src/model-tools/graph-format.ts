import { EdgeType, NodeType, Roles } from '../client.js'
import type { Edges } from '../services/edges/edges.schema.js'
import type { ModelsVersions } from '../services/models-versions/models-versions.schema.js'
import type { Nodes } from '../services/nodes/nodes.schema.js'

/** Names used towards language models instead of the numeric enums. */
export const NODE_TYPE_NAMES = {
  [NodeType.Stock]: 'stock',
  [NodeType.Variable]: 'variable',
  [NodeType.Flow]: 'flow',
  [NodeType.Converter]: 'converter',
  [NodeType.State]: 'state',
  [NodeType.Transition]: 'transition',
  [NodeType.Action]: 'action',
  [NodeType.Population]: 'population',
  [NodeType.Agent]: 'agent',
  [NodeType.Folder]: 'folder',
  [NodeType.Ghost]: 'ghost',
  [NodeType.OgcApiFeatures]: 'ogc-api-features'
} as const satisfies Record<NodeType, string>

export const EDGE_TYPE_NAMES = {
  [EdgeType.Link]: 'link',
  [EdgeType.Flow]: 'flow',
  [EdgeType.Transition]: 'transition',
  [EdgeType.AgentPopulation]: 'agent-population'
} as const satisfies Record<EdgeType, string>

export type NodeTypeName = (typeof NODE_TYPE_NAMES)[NodeType]
export type EdgeTypeName = (typeof EDGE_TYPE_NAMES)[EdgeType]

const invert = <K extends number, V extends string>(map: Record<K, V>) =>
  Object.fromEntries(Object.entries(map).map(([key, value]) => [value, Number(key)])) as Record<V, K>

export const NODE_TYPE_BY_NAME = invert<NodeType, NodeTypeName>(NODE_TYPE_NAMES)
export const EDGE_TYPE_BY_NAME = invert<EdgeType, EdgeTypeName>(EDGE_TYPE_NAMES)

/** Node types a tool may create. Ghost and OGC API Features nodes are read-only for now (see the plan). */
export const CREATABLE_NODE_TYPE_NAMES = [
  'stock',
  'variable',
  'flow',
  'converter',
  'state',
  'transition',
  'action',
  'population',
  'agent',
  'folder'
] as const satisfies readonly NodeTypeName[]

export const CONTAINER_NODE_TYPES: NodeType[] = [NodeType.Agent, NodeType.Folder]
export const ARROW_NODE_TYPES: NodeType[] = [NodeType.Flow, NodeType.Transition]

type DataField = { description: string; formula?: boolean }

/**
 * The type-specific fields of `node.data` a tool may set, per node type. This is the single source for input
 * validation and for the reference text given to language models. Fields set by the editor itself (for example
 * the direction of a flow) are intentionally missing.
 */
export const NODE_DATA_FIELDS: Partial<Record<NodeType, Record<string, DataField>>> = {
  [NodeType.Stock]: {
    value: { description: 'Initial value (equation). Note: the field is called "value".', formula: true },
    type: { description: '"Store" (default) or "Conveyor".' },
    delay: { description: 'Delay of a conveyor stock (equation).', formula: true },
    nonNegative: { description: 'If true the stock cannot become negative.' },
    units: { description: 'Units, for example "People". Default: unitless.' },
    constraints: { description: 'Optional { min, max } bounds checked during simulation.' }
  },
  [NodeType.Variable]: {
    value: { description: 'Equation or constant.', formula: true },
    units: { description: 'Units. Default: unitless.' },
    constraints: { description: 'Optional { min, max } bounds checked during simulation.' }
  },
  [NodeType.Flow]: {
    rate: { description: 'Flow rate per time unit (equation).', formula: true },
    nonNegative: { description: 'If true the flow cannot run backwards.' },
    units: { description: 'Units. Default: unitless.' },
    constraints: { description: 'Optional { min, max } bounds checked during simulation.' }
  },
  [NodeType.Converter]: {
    values: { description: 'Lookup table as an array of { x, y } points.' },
    interpolation: { description: '"Linear" (default) or "Discrete".' },
    units: { description: 'Units. Default: unitless.' },
    constraints: { description: 'Optional { min, max } bounds checked during simulation.' }
  },
  [NodeType.State]: {
    startActive: {
      description: 'Whether the state is active at the start (equation, e.g. "true"). Default "false".',
      formula: true
    },
    residency: { description: 'Minimum time to stay in the state (equation). Default "0".', formula: true }
  },
  [NodeType.Transition]: {
    value: { description: 'Trigger value (equation): timeout, probability or condition.', formula: true },
    trigger: { description: '"Timeout", "Probability" or "Condition".' },
    recalculate: { description: 'Recalculate the trigger value each time step.' },
    repeat: { description: 'Whether the transition can fire repeatedly.' },
    constraints: { description: 'Optional { min, max } bounds checked during simulation.' }
  },
  [NodeType.Action]: {
    value: { description: 'Trigger value (equation): timeout, probability or condition.', formula: true },
    action: { description: 'Equation executed when the action fires.', formula: true },
    trigger: { description: '"Timeout", "Probability" or "Condition".' },
    recalculate: { description: 'Recalculate the trigger value each time step.' },
    repeat: { description: 'Whether the action can fire repeatedly.' }
  },
  [NodeType.Population]: {
    populationSize: { description: 'Number of agents (number).' },
    units: { description: 'Units of the geometry, for example "Meters".' },
    geoWidth: { description: 'Width of the region the agents live in (equation). Required.', formula: true },
    geoHeight: {
      description: 'Height of the region the agents live in (equation). Required.',
      formula: true
    },
    geoWrapAround: { description: 'Whether the region wraps around at its borders.' },
    geoPlacementType: {
      description: '"Random" (default), "Grid", "Ellipse", "Network" or "Custom Function".'
    },
    geoPlacementFunction: { description: 'Placement equation for "Custom Function".', formula: true },
    networkType: { description: '"None" (default) or "Custom Function".' },
    networkFunction: { description: 'Network equation for "Custom Function".', formula: true }
  },
  [NodeType.Agent]: {},
  [NodeType.Folder]: {}
}

/** Values a simulation needs but a language model tends to leave out, set when a tool creates a node. */
export const NODE_DATA_CREATE_DEFAULTS: Partial<Record<NodeType, Record<string, unknown>>> = {
  [NodeType.State]: { startActive: 'false', residency: '0' }
}

/** Node types whose values are recorded by default when a tool creates them. */
export const DEFAULT_OUTPUT_NODE_TYPES: NodeType[] = [
  NodeType.Stock,
  NodeType.Flow,
  NodeType.Variable,
  NodeType.Converter,
  NodeType.State,
  NodeType.Population
]

/** Returns the names referenced as [Name] in the equations of a node. */
export function getFormulaReferences(node: Pick<Nodes, 'type' | 'data'>): string[] {
  const fields = NODE_DATA_FIELDS[node.type] ?? {}
  const names = new Set<string>()
  for (const [key, field] of Object.entries(fields)) {
    const value = (node.data as Record<string, unknown> | null)?.[key]
    if (!field.formula || typeof value !== 'string') {
      continue
    }
    for (const match of value.matchAll(/\[([^\[\]]+)\]/g)) {
      names.add(match[1].trim())
    }
  }
  return [...names]
}

const dropEmpty = <T extends Record<string, unknown>>(object: T) =>
  Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== null && value !== undefined && value !== '')
  ) as Partial<T>

export function serializeNode(node: Nodes) {
  return dropEmpty({
    id: node.id,
    type: NODE_TYPE_NAMES[node.type],
    name: node.name,
    description: node.description,
    data: node.data && Object.keys(node.data).length > 0 ? node.data : undefined,
    parentId: node.parentId,
    ghostOf: node.ghostParentId,
    isParameter: node.isParameter || undefined,
    parameterMin: node.isParameter ? node.parameterMin : undefined,
    parameterMax: node.isParameter ? node.parameterMax : undefined,
    parameterStep: node.isParameter ? node.parameterStep : undefined,
    isOutputParameter: node.isOutputParameter,
    position: { x: Math.round(node.position.x), y: Math.round(node.position.y) }
  })
}

export function serializeEdge(edge: Edges) {
  return {
    id: edge.id,
    type: EDGE_TYPE_NAMES[edge.type],
    source: edge.sourceId,
    target: edge.targetId
  }
}

export function serializeVersion(version: ModelsVersions) {
  return {
    id: version.id,
    modelId: version.modelId,
    version: `${version.majorVersion}.${version.minorVersion}.${version.draftVersion}`,
    state: version.publishedAt ? 'published' : 'draft',
    isLatest: !!version.isLatest,
    editable: !version.publishedAt && !!version.isLatest && (version.role ?? 0) >= Roles.collaborator,
    role: Roles[version.role ?? 0],
    notes: version.notes ?? undefined,
    settings: {
      timeUnits: version.timeUnits,
      timeStart: version.timeStart,
      timeLength: version.timeLength,
      timeStep: version.timeStep,
      algorithm: version.algorithm,
      globals: version.globals || undefined
    }
  }
}
