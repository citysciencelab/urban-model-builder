import { Type, type Static } from '@feathersjs/typebox'
import { isDeepStrictEqual } from 'node:util'
import { EdgeType, NodeType } from '../client.js'
import type { HookContext } from '../declarations.js'
import type { Edges } from '../services/edges/edges.schema.js'
import { manageDefaultScenariosValues } from '../services/nodes/hooks/manage-default-scenarios-values.js'
import type { Nodes } from '../services/nodes/nodes.schema.js'
import { NODE_TYPE_TO_PARAMETER_NAME_MAP } from '../shared/simulation-adapter/simulation-adapter.js'
import { Literals } from '../utils/schema.js'
import { getEditableVersion, loadGraph } from './access.js'
import { executeBatch, type BatchOperation } from './batch.js'
import {
  ARROW_NODE_TYPES,
  CONTAINER_NODE_TYPES,
  CREATABLE_NODE_TYPE_NAMES,
  DEFAULT_OUTPUT_NODE_TYPES,
  EDGE_TYPE_BY_NAME,
  EDGE_TYPE_NAMES,
  NODE_DATA_CREATE_DEFAULTS,
  NODE_DATA_FIELDS,
  NODE_TYPE_BY_NAME,
  NODE_TYPE_NAMES
} from './graph-format.js'
import { arrowDirection, computeLayout, edgeHandles, type LayoutNode } from './layout.js'
import { resolveOgcNodeData } from './ogc.js'
import { ToolError, type ToolContext } from './types.js'
import { buildReferenceIndex, checkReferences, validateGraph } from './validate.js'

const positionSchema = Type.Object({ x: Type.Number(), y: Type.Number() }, { additionalProperties: false })
const dataSchema = Type.Object(
  {},
  { additionalProperties: true, description: 'Type-specific fields, see get_modeling_reference.' }
)

const parameterProperties = {
  isParameter: Type.Optional(
    Type.Boolean({
      description:
        'Expose the node as an input parameter (slider) of the model. Requires parameterMin and parameterMax.'
    })
  ),
  parameterMin: Type.Optional(Type.Number()),
  parameterMax: Type.Optional(Type.Number()),
  parameterStep: Type.Optional(Type.Number()),
  isOutputParameter: Type.Optional(
    Type.Boolean({ description: 'Record the values of this node in simulation results.' })
  )
}

export const graphPatchSchema = Type.Object(
  {
    modelVersionId: Type.String({ format: 'uuid' }),
    createNodes: Type.Optional(
      Type.Array(
        Type.Object(
          {
            ref: Type.Optional(
              Type.String({
                description:
                  'Temporary key of your choice to refer to this node in "parent", "source" and "target" of the same call.'
              })
            ),
            type: Literals(...CREATABLE_NODE_TYPE_NAMES),
            name: Type.String({ minLength: 1 }),
            description: Type.Optional(Type.String()),
            data: Type.Optional(dataSchema),
            parent: Type.Optional(
              Type.String({ description: 'Id or ref of the agent or folder that contains this node.' })
            ),
            position: Type.Optional(
              Type.Object(positionSchema.properties, {
                additionalProperties: false,
                description: 'Usually omitted: nodes without a position are arranged automatically.'
              })
            ),
            ...parameterProperties
          },
          { additionalProperties: false }
        ),
        { maxItems: 200 }
      )
    ),
    updateNodes: Type.Optional(
      Type.Array(
        Type.Object(
          {
            id: Type.String({ format: 'uuid' }),
            name: Type.Optional(Type.String({ minLength: 1 })),
            description: Type.Optional(Type.String()),
            data: Type.Optional(
              Type.Object(
                {},
                {
                  additionalProperties: true,
                  description: 'Fields to change; other fields are kept. Set a field to null to remove it.'
                }
              )
            ),
            parent: Type.Optional(
              Type.Union([Type.String(), Type.Null()], {
                description: 'Id or ref of the new containing agent or folder, null for the top level.'
              })
            ),
            position: Type.Optional(positionSchema),
            ...parameterProperties
          },
          { additionalProperties: false }
        ),
        { maxItems: 200 }
      )
    ),
    deleteNodeIds: Type.Optional(
      Type.Array(Type.String({ format: 'uuid' }), {
        maxItems: 200,
        description: 'Also deletes the edges of these nodes, the nodes inside them and their ghosts.'
      })
    ),
    createEdges: Type.Optional(
      Type.Array(
        Type.Object(
          {
            type: Literals(...Object.values(EDGE_TYPE_NAMES)),
            source: Type.String({ description: 'Id or ref of the source node.' }),
            target: Type.String({ description: 'Id or ref of the target node.' })
          },
          { additionalProperties: false }
        ),
        { maxItems: 400 }
      )
    ),
    deleteEdgeIds: Type.Optional(Type.Array(Type.String({ format: 'uuid' }), { maxItems: 400 })),
    autoLink: Type.Optional(
      Type.Boolean({
        description:
          'Create missing link edges for the [Name] references in the equations of created or changed nodes. Default true.'
      })
    )
  },
  { additionalProperties: false }
)

export type GraphPatch = Static<typeof graphPatchSchema>

type ParameterSettings = {
  isParameter?: boolean
  parameterMin?: number
  parameterMax?: number
  parameterStep?: number
  isOutputParameter?: boolean
}

type WorkNode = Nodes & { isNew?: boolean; ref?: string; needsPosition?: boolean }
type WorkEdge = Pick<Edges, 'id' | 'type' | 'sourceId' | 'targetId'> & {
  isNew?: boolean
  autoLinked?: boolean
}

const PATCHABLE_NODE_FIELDS = [
  'name',
  'description',
  'data',
  'position',
  'width',
  'height',
  'parentId',
  'isParameter',
  'parameterType',
  'parameterMin',
  'parameterMax',
  'parameterStep',
  'isOutputParameter'
] as const

const describe = (node: Pick<Nodes, 'name' | 'type'>) => `${NODE_TYPE_NAMES[node.type]} "${node.name ?? ''}"`

/** Checks the type-specific fields against the fields a tool may set and converts numbers in equations. */
function normalizeData(type: NodeType, data: Record<string, unknown>, label: string, errors: string[]) {
  const fields = NODE_DATA_FIELDS[type]
  if (!fields) {
    errors.push(`${label}: the data of ${NODE_TYPE_NAMES[type]} nodes cannot be set with this tool.`)
    return {}
  }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!(key in fields)) {
      const allowed = Object.keys(fields).join(', ') || 'none'
      errors.push(
        `${label}: unknown data field "${key}" for a ${NODE_TYPE_NAMES[type]}. Allowed fields: ${allowed}.`
      )
      continue
    }
    const isScalar = typeof value === 'number' || typeof value === 'boolean'
    result[key] = fields[key].formula && isScalar ? String(value) : value
  }
  return result
}

/** Applies a batch of changes to the graph of a draft version: all of it, or nothing. */
export async function applyGraphPatch(ctx: ToolContext, input: GraphPatch) {
  const version = await getEditableVersion(ctx, input.modelVersionId)
  const stored = await loadGraph(ctx, version.id)
  const originals = new Map(stored.nodes.map((node) => [node.id, node]))

  // The working copy the patch is applied to in memory first. Problems are collected rather than thrown one by
  // one, so that the caller can correct all of them in a single further attempt.
  const nodes = new Map<string, WorkNode>(stored.nodes.map((node) => [node.id, structuredClone(node)]))
  let edges: WorkEdge[] = stored.edges.map((edge) => ({ ...edge }))
  const errors: string[] = []
  const warnings: string[] = []

  // --- deletions -------------------------------------------------------------------------------------------
  const removedNodes: WorkNode[] = []
  const nodeRemovalRoots: string[] = []
  const removeWithDependents = (id: string) => {
    const node = nodes.get(id)
    if (!node) {
      return
    }
    nodes.delete(id)
    for (const other of [...nodes.values()]) {
      if (other.parentId === id || other.ghostParentId === id) {
        removeWithDependents(other.id)
      }
    }
    removedNodes.push(node)
  }
  for (const id of new Set(input.deleteNodeIds ?? [])) {
    if (!originals.has(id)) {
      errors.push(`deleteNodeIds: node ${id} does not exist in this model version.`)
    } else if (nodes.has(id)) {
      // not yet removed as a dependent of another deleted node
      nodeRemovalRoots.push(id)
      removeWithDependents(id)
    }
  }
  const removedNodeIds = new Set(removedNodes.map((node) => node.id))
  const cascadedEdges = edges.filter(
    (edge) => removedNodeIds.has(edge.sourceId) || removedNodeIds.has(edge.targetId)
  )
  edges = edges.filter((edge) => !cascadedEdges.includes(edge))

  const edgeRemovals: string[] = []
  for (const id of new Set(input.deleteEdgeIds ?? [])) {
    if (edges.some((edge) => edge.id === id)) {
      edgeRemovals.push(id)
      edges = edges.filter((edge) => edge.id !== id)
    } else if (!cascadedEdges.some((edge) => edge.id === id)) {
      errors.push(`deleteEdgeIds: edge ${id} does not exist in this model version.`)
    }
  }

  // --- node creations --------------------------------------------------------------------------------------
  const idByRef = new Map<string, string>()
  const resolve = (key: string) => idByRef.get(key) ?? (nodes.has(key) ? key : null)
  const parentRequests: { node: WorkNode; parent: string | null; label: string }[] = []

  const applyParameterSettings = (node: WorkNode, settings: ParameterSettings, label: string) => {
    if (settings.isOutputParameter !== undefined) {
      node.isOutputParameter = settings.isOutputParameter
    }
    if (settings.parameterMin !== undefined) node.parameterMin = settings.parameterMin
    if (settings.parameterMax !== undefined) node.parameterMax = settings.parameterMax
    if (settings.parameterStep !== undefined) node.parameterStep = settings.parameterStep
    if (settings.isParameter !== undefined) {
      node.isParameter = settings.isParameter
    }
    if (!node.isParameter) {
      if (settings.isParameter === false) {
        node.parameterType = null
      }
      return
    }
    if (!(node.type in NODE_TYPE_TO_PARAMETER_NAME_MAP)) {
      errors.push(`${label}: a ${NODE_TYPE_NAMES[node.type]} cannot be a parameter.`)
      return
    }
    if (node.parameterMin == null || node.parameterMax == null || node.parameterMin >= node.parameterMax) {
      errors.push(
        `${label}: a parameter needs parameterMin and parameterMax with parameterMin < parameterMax.`
      )
      return
    }
    node.parameterType ??= 'slider'
    node.parameterStep ??= (node.parameterMax - node.parameterMin) / 100
  }

  /** OGC nodes make the server request data, so their service has to be one the server allows. */
  const resolveOgcData = (node: WorkNode, endpointChosen: boolean, label: string) => {
    try {
      node.data = resolveOgcNodeData(ctx.app, version, node.data, endpointChosen)
    } catch (error) {
      if (!(error instanceof ToolError)) {
        throw error
      }
      errors.push(`${label}: ${error.message}`)
    }
  }

  ;(input.createNodes ?? []).forEach((create, index) => {
    const label = `createNodes[${index}] (${create.name})`
    const type = NODE_TYPE_BY_NAME[create.type]
    const node: WorkNode = {
      id: `new-node-${index}`,
      modelsVersionsId: version.id,
      type,
      name: create.name,
      description: create.description ?? null,
      data: { ...NODE_DATA_CREATE_DEFAULTS[type], ...normalizeData(type, create.data ?? {}, label, errors) },
      position: create.position ?? { x: 0, y: 0 },
      width: null,
      height: null,
      parentId: null,
      ghostParentId: null,
      isParameter: false,
      parameterType: null,
      parameterMin: null,
      parameterMax: null,
      parameterStep: null,
      parameterOptions: null,
      isOutputParameter: DEFAULT_OUTPUT_NODE_TYPES.includes(type),
      isNew: true,
      ref: create.ref,
      needsPosition: !create.position
    }
    applyParameterSettings(node, create, label)
    if (type === NodeType.OgcApiFeatures) {
      resolveOgcData(node, true, label)
    }

    if (create.ref !== undefined) {
      if (idByRef.has(create.ref) || originals.has(create.ref)) {
        errors.push(`${label}: the ref "${create.ref}" is already in use.`)
      } else {
        idByRef.set(create.ref, node.id)
      }
    }
    if (create.parent !== undefined) {
      parentRequests.push({ node, parent: create.parent, label })
    }
    nodes.set(node.id, node)
  })

  // --- node updates ----------------------------------------------------------------------------------------
  const dataChanged = new Set<string>()
  ;(input.updateNodes ?? []).forEach((update, index) => {
    const label = `updateNodes[${index}]`
    const node = nodes.get(update.id)
    if (!node || node.isNew) {
      errors.push(
        `${label}: node ${update.id} does not exist in this model version or is deleted by this call.`
      )
      return
    }
    if (update.name !== undefined) node.name = update.name
    if (update.description !== undefined) node.description = update.description
    if (update.position !== undefined) node.position = update.position
    if (update.data !== undefined) {
      const data: Record<string, unknown> = { ...node.data }
      for (const [key, value] of Object.entries(normalizeData(node.type, update.data, label, errors))) {
        if (value === null) {
          delete data[key]
        } else {
          data[key] = value
        }
      }
      node.data = data
      dataChanged.add(node.id)
      if (node.type === NodeType.OgcApiFeatures) {
        resolveOgcData(node, 'endpointId' in update.data, label)
      }
    }
    applyParameterSettings(node, update, label)
    if (update.parent !== undefined) {
      parentRequests.push({ node, parent: update.parent, label })
    }
  })

  // --- containment -----------------------------------------------------------------------------------------
  for (const { node, parent, label } of parentRequests) {
    if (parent === null) {
      node.parentId = null
      continue
    }
    const parentId = resolve(parent)
    const parentNode = parentId ? nodes.get(parentId) : undefined
    if (!parentNode) {
      errors.push(
        `${label}: the parent "${parent}" is neither the id of an existing node nor a ref of this call.`
      )
    } else if (!CONTAINER_NODE_TYPES.includes(parentNode.type)) {
      errors.push(`${label}: the parent must be an agent or a folder, but is a ${describe(parentNode)}.`)
    } else {
      node.parentId = parentNode.id
    }
  }
  for (const { node, label } of parentRequests) {
    const seen = new Set([node.id])
    let ancestor = node.parentId ? nodes.get(node.parentId) : undefined
    while (ancestor) {
      if (seen.has(ancestor.id)) {
        errors.push(`${label}: a node cannot be inside itself.`)
        node.parentId = null
        break
      }
      seen.add(ancestor.id)
      ancestor = ancestor.parentId ? nodes.get(ancestor.parentId) : undefined
    }
  }

  // --- edge creations --------------------------------------------------------------------------------------
  // an edge attached to a ghost counts for the original node
  const originType = (node: WorkNode) =>
    node.type === NodeType.Ghost && node.ghostParentId ? nodes.get(node.ghostParentId)?.type : node.type
  const originId = (node: WorkNode) => (node.type === NodeType.Ghost && node.ghostParentId) || node.id

  const edgeProblem = (type: EdgeType, source: WorkNode, target: WorkNode): string | null => {
    const sourceType = originType(source)
    const targetType = originType(target)
    const between = `between ${describe(source)} and ${describe(target)}`

    if (originId(source) === originId(target)) {
      return 'source and target are the same node.'
    }
    if (edges.some((e) => e.type === type && e.sourceId === source.id && e.targetId === target.id)) {
      return `there already is such an edge ${between}.`
    }
    if (type === EdgeType.Link) {
      if ([sourceType, targetType].some((t) => t === undefined || CONTAINER_NODE_TYPES.includes(t))) {
        return 'agents and folders cannot have links.'
      }
      if (targetType === NodeType.OgcApiFeatures) {
        return 'a geodata node has no inputs; links can only start from it.'
      }
      if (targetType === NodeType.Converter && edges.some((e) => e.targetId === target.id)) {
        return `the converter "${target.name}" already has an input; a converter takes exactly one.`
      }
      return null
    }
    if (type === EdgeType.AgentPopulation) {
      if (source.type !== NodeType.Agent || targetType !== NodeType.Population) {
        return `an agent-population edge must go from an agent to a population, not ${between}.`
      }
      if (edges.some((e) => e.type === type && e.targetId === target.id)) {
        return `the population "${target.name}" already has an agent.`
      }
      return null
    }

    const [arrowType, endpointType, arrowName, endpointName] =
      type === EdgeType.Flow
        ? ([NodeType.Flow, NodeType.Stock, 'flow', 'stock'] as const)
        : ([NodeType.Transition, NodeType.State, 'transition', 'state'] as const)
    if (source.type === arrowType && targetType === endpointType) {
      return edges.some((e) => e.type === type && e.sourceId === source.id)
        ? `the ${arrowName} "${source.name}" already has an end ${endpointName}.`
        : null
    }
    if (sourceType === endpointType && target.type === arrowType) {
      return edges.some((e) => e.type === type && e.targetId === target.id)
        ? `the ${arrowName} "${target.name}" already has a start ${endpointName}.`
        : null
    }
    return `a ${arrowName} edge must go from a ${endpointName} to a ${arrowName} node or from a ${arrowName} node to a ${endpointName}, not ${between}.`
  }

  ;(input.createEdges ?? []).forEach((create, index) => {
    const label = `createEdges[${index}]`
    const source = nodes.get(resolve(create.source) ?? '')
    const target = nodes.get(resolve(create.target) ?? '')
    if (!source || !target) {
      const missing = !source ? create.source : create.target
      errors.push(`${label}: "${missing}" is neither the id of an existing node nor a ref of this call.`)
      return
    }
    const type = EDGE_TYPE_BY_NAME[create.type]
    const problem = edgeProblem(type, source, target)
    if (problem) {
      errors.push(`${label}: ${problem}`)
      return
    }
    edges.push({ id: `new-edge-${index}`, type, sourceId: source.id, targetId: target.id, isNew: true })
  })

  // --- links for references in equations -------------------------------------------------------------------
  const referenceIndex = buildReferenceIndex([...nodes.values()], edges)
  for (const node of nodes.values()) {
    if (!node.isNew && !dataChanged.has(node.id)) {
      continue
    }
    const references = checkReferences(node, referenceIndex)
    for (const name of [...references.unknown, ...references.ambiguous]) {
      const reason = references.unknown.includes(name)
        ? 'no node has that name'
        : 'several nodes have that name'
      warnings.push(`${describe(node)} references [${name}], but ${reason}.`)
    }
    for (const referenced of references.unlinked) {
      if (input.autoLink === false) {
        warnings.push(`${describe(node)} references [${referenced.name}] without a link from that node.`)
        continue
      }
      edges.push({
        id: `new-link-${edges.length}`,
        type: EdgeType.Link,
        sourceId: referenced.id,
        targetId: node.id,
        isNew: true,
        autoLinked: true
      })
      referenceIndex.connect(referenced.id, node.id)
    }
  }

  if (errors.length > 0) {
    throw new ToolError(
      'invalid_input',
      `Nothing was changed, because the patch has problems:\n- ${errors.join('\n- ')}`,
      {
        errors
      }
    )
  }

  // --- layout ----------------------------------------------------------------------------------------------
  const movable = new Set([...nodes.values()].filter((node) => node.needsPosition).map((node) => node.id))
  const layoutNodes = nodes as unknown as Map<string, LayoutNode>
  for (const [id, change] of computeLayout([...layoutNodes.values()], edges, movable)) {
    Object.assign(nodes.get(id)!, change)
  }
  for (const node of nodes.values()) {
    if (node.isNew && ARROW_NODE_TYPES.includes(node.type)) {
      const direction = arrowDirection(node as unknown as LayoutNode, edges, layoutNodes)
      if (direction) {
        node.data = { ...node.data, direction }
      }
    }
  }

  // --- write -----------------------------------------------------------------------------------------------
  const operations: BatchOperation[] = []
  for (const id of edgeRemovals) {
    operations.push({ service: 'edges', method: 'remove', id })
  }
  for (const id of nodeRemovalRoots) {
    operations.push({ service: 'nodes', method: 'remove', id })
  }

  const depth = (node: WorkNode): number => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    return parent ? depth(parent) + 1 : 0
  }
  const newNodes = [...nodes.values()].filter((node) => node.isNew).sort((a, b) => depth(a) - depth(b))
  for (const node of newNodes) {
    operations.push({
      service: 'nodes',
      method: 'create',
      placeholderId: node.id,
      data: (ids) => {
        const { id, isNew, ref, needsPosition, ...data } = node
        return { ...data, parentId: data.parentId ? (ids.get(data.parentId) ?? data.parentId) : null }
      }
    })
  }

  const patchedNodeIds: string[] = []
  for (const [id, original] of originals) {
    const node = nodes.get(id)
    if (!node) {
      continue
    }
    const changedFields = PATCHABLE_NODE_FIELDS.filter(
      (field) => !isDeepStrictEqual(node[field], original[field])
    )
    if (changedFields.length === 0) {
      continue
    }
    patchedNodeIds.push(id)
    operations.push({
      service: 'nodes',
      method: 'patch',
      id,
      data: (ids) => {
        const data: Record<string, unknown> = Object.fromEntries(
          changedFields.map((field) => [field, node[field]])
        )
        if (typeof data.parentId === 'string') {
          data.parentId = ids.get(data.parentId) ?? data.parentId
        }
        return data
      }
    })
  }

  const newEdges = edges.filter((edge) => edge.isNew)
  for (const edge of newEdges) {
    operations.push({
      service: 'edges',
      method: 'create',
      placeholderId: edge.id,
      data: (ids) => ({
        modelsVersionsId: version.id,
        type: edge.type,
        sourceId: ids.get(edge.sourceId) ?? edge.sourceId,
        targetId: ids.get(edge.targetId) ?? edge.targetId,
        ...edgeHandles(edge, layoutNodes),
        points: null
      })
    })
  }

  const cascaded = [
    ...cascadedEdges.map((record) => ({ service: 'edges' as const, record })),
    ...removedNodes
      .filter((node) => !nodeRemovalRoots.includes(node.id))
      .map((record) => ({ service: 'nodes' as const, record }))
  ]
  const { ids } = await executeBatch(ctx.app, operations, cascaded)

  // --- follow-up -------------------------------------------------------------------------------------------
  const final = await loadGraph(ctx, version.id)
  const finalNodes = new Map(final.nodes.map((node) => [node.id, node]))

  // Parameters need a value in the default scenario. The existing hook does that for single patches from the
  // editor; it is reused here for every node whose parameter flag may have changed.
  const parameterChanges = [
    ...[...newNodes.map((node) => ids.get(node.id)!), ...patchedNodeIds]
      .map((id) => finalNodes.get(id)!)
      .filter((node) => node.isParameter || originals.get(node.id)?.isParameter)
      .map((node) => ({ node, method: 'patch' })),
    ...removedNodes.filter((node) => node.isParameter).map((node) => ({ node, method: 'remove' }))
  ]
  for (const { node, method } of parameterChanges) {
    try {
      await manageDefaultScenariosValues({ app: ctx.app, result: node, method } as unknown as HookContext)
    } catch (error: any) {
      warnings.push(`The default scenario value of "${node.name}" could not be updated: ${error.message}`)
    }
  }

  const realId = (id: string) => ids.get(id) ?? id
  return {
    createdNodes: newNodes.map((node) => ({
      ref: node.ref,
      id: realId(node.id),
      type: NODE_TYPE_NAMES[node.type],
      name: node.name
    })),
    createdEdges: newEdges.map((edge) => ({
      id: realId(edge.id),
      type: EDGE_TYPE_NAMES[edge.type],
      source: realId(edge.sourceId),
      target: realId(edge.targetId),
      ...(edge.autoLinked ? { autoLinked: true } : {})
    })),
    updatedNodeIds: patchedNodeIds,
    deletedNodeIds: removedNodes.map((node) => node.id),
    deletedEdgeIds: [...edgeRemovals, ...cascadedEdges.map((edge) => edge.id)],
    warnings,
    issues: validateGraph(final.nodes, final.edges)
  }
}
