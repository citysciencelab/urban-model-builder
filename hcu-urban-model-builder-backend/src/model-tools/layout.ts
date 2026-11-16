import dagre from '@dagrejs/dagre'
import { EdgeType, NodeType } from '../client.js'
import { ARROW_NODE_TYPES, CONTAINER_NODE_TYPES } from './graph-format.js'

export type Side = 'top' | 'right' | 'bottom' | 'left'

/** The parts of a node the layout needs. Positions are relative to the parent, as in the editor. */
export type LayoutNode = {
  id: string
  type: NodeType
  parentId: string | null
  ghostParentId: string | null
  position: { x: number; y: number }
  width: number | null
  height: number | null
  data: { direction?: Side }
}

export type LayoutEdge = { type: EdgeType; sourceId: string; targetId: string }

export type LayoutChange = { position?: { x: number; y: number }; width?: number; height?: number }

// Same order as in the editor's arrow node, the handle numbering below depends on it
const SIDES: Side[] = ['top', 'right', 'bottom', 'left']
const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

// Approximate rendered sizes of the editor's nodes, used when a node has no explicit size
const BASE_SIZE = { width: 200, height: 70 }
const ARROW_SIZE = { width: 170, height: 56 }
export const CONTAINER_MIN_SIZE = { width: 216, height: 108 }

const CONTAINER_PADDING = 32
const CONTAINER_HEADER = 56
const GAP_TO_EXISTING = 80

const isContainer = (node: LayoutNode) => CONTAINER_NODE_TYPES.includes(node.type)

export function nodeSize(node: LayoutNode) {
  const fallback = isContainer(node)
    ? CONTAINER_MIN_SIZE
    : ARROW_NODE_TYPES.includes(node.type)
      ? ARROW_SIZE
      : BASE_SIZE
  return { width: node.width ?? fallback.width, height: node.height ?? fallback.height }
}

/**
 * Computes positions for the `movable` nodes and sizes for containers that have to grow.
 *
 * Each container is laid out on its own, innermost first, so that a container is a single box for the level
 * above. Nodes that are not movable keep their place; movable siblings are laid out as a block below them.
 * The given nodes are not modified.
 */
export function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  movable: Set<string>
): Map<string, LayoutChange> {
  // work on copies so that sizes and positions of inner levels are visible to outer levels
  const byId = new Map(nodes.map((node) => [node.id, { ...node, position: { ...node.position } }]))
  const byParent = new Map<string | null, LayoutNode[]>()
  for (const node of byId.values()) {
    const siblings = byParent.get(node.parentId) ?? []
    siblings.push(node)
    byParent.set(node.parentId, siblings)
  }
  const changes = new Map<string, LayoutChange>()
  const change = (id: string, patch: LayoutChange) => changes.set(id, { ...changes.get(id), ...patch })

  /** The node on the level of `parentId` that contains `nodeId` (or is it). */
  const ancestorOnLevel = (nodeId: string, parentId: string | null) => {
    let node = byId.get(nodeId)
    while (node && node.parentId !== parentId) {
      node = node.parentId ? byId.get(node.parentId) : undefined
    }
    return node?.id ?? null
  }

  const layoutLevel = (parentId: string | null) => {
    const children = byParent.get(parentId) ?? []
    for (const child of children) {
      if (isContainer(child)) {
        layoutLevel(child.id)
      }
    }

    const movableChildren = children.filter((child) => movable.has(child.id))
    const fixedChildren = children.filter((child) => !movable.has(child.id))

    if (movableChildren.length > 0) {
      const graph = new dagre.graphlib.Graph()
      graph.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 90 })
      graph.setDefaultEdgeLabel(() => ({}))
      for (const child of movableChildren) {
        graph.setNode(child.id, nodeSize(child))
      }
      for (const edge of edges) {
        const source = ancestorOnLevel(edge.sourceId, parentId)
        const target = ancestorOnLevel(edge.targetId, parentId)
        if (source && target && source !== target && graph.hasNode(source) && graph.hasNode(target)) {
          graph.setEdge(source, target)
        }
      }
      dagre.layout(graph)

      // dagre returns centres; convert to top-left corners relative to the block's own bounding box
      const corners = movableChildren.map((child) => {
        const { x, y } = graph.node(child.id)
        const size = nodeSize(child)
        return { child, x: x - size.width / 2, y: y - size.height / 2 }
      })
      const blockX = Math.min(...corners.map((corner) => corner.x))
      const blockY = Math.min(...corners.map((corner) => corner.y))

      let origin = parentId ? { x: CONTAINER_PADDING, y: CONTAINER_HEADER } : { x: 0, y: 0 }
      if (fixedChildren.length > 0) {
        origin = {
          x: Math.min(...fixedChildren.map((child) => child.position.x)),
          y:
            Math.max(...fixedChildren.map((child) => child.position.y + nodeSize(child).height)) +
            GAP_TO_EXISTING
        }
      }

      for (const { child, x, y } of corners) {
        child.position = { x: Math.round(origin.x + x - blockX), y: Math.round(origin.y + y - blockY) }
        change(child.id, { position: child.position })
      }
    }

    const parent = parentId ? byId.get(parentId) : undefined
    if (parent) {
      const right = Math.max(0, ...children.map((child) => child.position.x + nodeSize(child).width))
      const bottom = Math.max(0, ...children.map((child) => child.position.y + nodeSize(child).height))
      const width = Math.max(CONTAINER_MIN_SIZE.width, parent.width ?? 0, right + CONTAINER_PADDING)
      const height = Math.max(CONTAINER_MIN_SIZE.height, parent.height ?? 0, bottom + CONTAINER_PADDING)
      if (width !== parent.width || height !== parent.height) {
        parent.width = width
        parent.height = height
        change(parent.id, { width, height })
      }
    }
  }

  layoutLevel(null)
  return changes
}

function absoluteCenter(node: LayoutNode, byId: Map<string, LayoutNode>) {
  const size = nodeSize(node)
  let x = node.position.x + size.width / 2
  let y = node.position.y + size.height / 2
  let parent = node.parentId ? byId.get(node.parentId) : undefined
  while (parent) {
    x += parent.position.x
    y += parent.position.y
    parent = parent.parentId ? byId.get(parent.parentId) : undefined
  }
  return { x, y }
}

/** The side of `from` that faces `to`. */
function facingSide(from: LayoutNode, to: LayoutNode, byId: Map<string, LayoutNode>): Side {
  const a = absoluteCenter(from, byId)
  const b = absoluteCenter(to, byId)
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'bottom' : 'top'
}

/**
 * The direction a flow or transition node should point to: towards its end node, or away from its start node.
 * Returns null if it is connected to neither.
 */
export function arrowDirection(
  node: LayoutNode,
  edges: LayoutEdge[],
  byId: Map<string, LayoutNode>
): Side | null {
  const edgeType = node.type === NodeType.Flow ? EdgeType.Flow : EdgeType.Transition
  const outgoing = edges.find((edge) => edge.type === edgeType && edge.sourceId === node.id)
  const incoming = edges.find((edge) => edge.type === edgeType && edge.targetId === node.id)
  const end = outgoing && byId.get(outgoing.targetId)
  const start = incoming && byId.get(incoming.sourceId)
  if (end) {
    return facingSide(node, end, byId)
  }
  if (start) {
    return OPPOSITE[facingSide(node, start, byId)]
  }
  return null
}

/** Handle id for a link on a regular node or on the free sides of an arrow node (flow, transition). */
function linkHandle(node: LayoutNode, kind: 'source' | 'target', side: Side) {
  if (!ARROW_NODE_TYPES.includes(node.type)) {
    return `${kind}-${side}`
  }
  // An arrow node offers link handles only on the two sides perpendicular to its direction. The editor
  // numbers them 0 and 1: 0 is the side counter-clockwise of the direction, 1 the side clockwise of it.
  const directionIndex = SIDES.indexOf(node.data.direction ?? 'right')
  const side0 = SIDES[(directionIndex + 3) % 4]
  const side1 = SIDES[(directionIndex + 1) % 4]
  if (side === side1) {
    return `${kind}-1`
  }
  if (side === side0) {
    return `${kind}-0`
  }
  // the other node lies in line with the arrow, either free side is equally good
  return `${kind}-0`
}

/** Chooses the handles of an edge from the relative position of its two nodes, as a user would. */
export function edgeHandles(edge: LayoutEdge, byId: Map<string, LayoutNode>) {
  const source = byId.get(edge.sourceId)!
  const target = byId.get(edge.targetId)!
  const sourceSide = facingSide(source, target, byId)
  const targetSide = facingSide(target, source, byId)

  if (edge.type === EdgeType.Flow || edge.type === EdgeType.Transition) {
    const prefix = edge.type === EdgeType.Flow ? 'flow' : 'transition'
    return ARROW_NODE_TYPES.includes(source.type)
      ? { sourceHandle: `${prefix}-source`, targetHandle: `target-${targetSide}` }
      : { sourceHandle: `source-${sourceSide}`, targetHandle: `${prefix}-target` }
  }
  if (edge.type === EdgeType.AgentPopulation) {
    return { sourceHandle: `agent-source-${sourceSide}`, targetHandle: `target-${targetSide}` }
  }
  return {
    sourceHandle: linkHandle(source, 'source', sourceSide),
    targetHandle: linkHandle(target, 'target', targetSide)
  }
}
