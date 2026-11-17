import { EdgeType, NodeType } from '../client.js'
import { getFormulaReferences, NODE_TYPE_NAMES } from './graph-format.js'

/** The parts of nodes and edges the checks need, so they work on stored and on not yet stored graphs. */
export type CheckNode = {
  id: string
  type: NodeType
  name?: string | null
  data: Record<string, any>
  ghostParentId?: string | null
}
export type CheckEdge = { type: EdgeType; sourceId: string; targetId: string }

export type GraphIssue = {
  severity: 'error' | 'warning'
  nodeId?: string
  nodeName?: string
  message: string
}

const normalizeName = (name: string) => name.trim().toLowerCase()

/**
 * Index to answer whether a node may use another node in its equations. A node can reference the nodes linked
 * to it, and a flow or transition can reference the nodes it connects.
 */
export function buildReferenceIndex(nodes: CheckNode[], edges: CheckEdge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  // edges may be attached to a ghost, which stands for its original node
  const origin = (id: string) => byId.get(id)?.ghostParentId ?? id

  const connections = new Set<string>()
  const connect = (sourceId: string, targetId: string) => connections.add(`${sourceId}>${targetId}`)
  for (const edge of edges) {
    const source = origin(edge.sourceId)
    const target = origin(edge.targetId)
    connect(source, target)
    if (edge.type === EdgeType.Flow || edge.type === EdgeType.Transition) {
      connect(target, source)
    }
  }

  const byName = new Map<string, CheckNode[]>()
  for (const node of nodes) {
    if (node.type === NodeType.Ghost || !node.name) {
      continue
    }
    const key = normalizeName(node.name)
    byName.set(key, [...(byName.get(key) ?? []), node])
  }

  return {
    origin,
    byName,
    isConnected: (sourceId: string, targetId: string) => connections.has(`${sourceId}>${targetId}`),
    connect
  }
}

export type ReferenceIndex = ReturnType<typeof buildReferenceIndex>

/** Sorts the [Name] references of a node into unknown names, ambiguous names and nodes that are not linked. */
export function checkReferences(node: CheckNode, index: ReferenceIndex) {
  const unknown: string[] = []
  const ambiguous: string[] = []
  const unlinked: CheckNode[] = []

  for (const name of getFormulaReferences(node)) {
    const candidates = index.byName.get(normalizeName(name)) ?? []
    if (candidates.length === 0) {
      unknown.push(name)
    } else if (candidates.length > 1) {
      ambiguous.push(name)
    } else if (candidates[0].id !== node.id && !index.isConnected(candidates[0].id, node.id)) {
      unlinked.push(candidates[0])
    }
  }
  return { unknown, ambiguous, unlinked }
}

/** Static checks that find the usual reasons for a failing or meaningless simulation without running it. */
export function validateGraph(nodes: CheckNode[], edges: CheckEdge[]): GraphIssue[] {
  const issues: GraphIssue[] = []
  const index = buildReferenceIndex(nodes, edges)
  const report = (severity: GraphIssue['severity'], node: CheckNode, message: string) =>
    issues.push({ severity, nodeId: node.id, nodeName: node.name ?? undefined, message })

  const incoming = (node: CheckNode, type: EdgeType) =>
    edges.filter((edge) => edge.type === type && index.origin(edge.targetId) === node.id)
  const outgoing = (node: CheckNode, type: EdgeType) =>
    edges.filter((edge) => edge.type === type && index.origin(edge.sourceId) === node.id)

  for (const [, sameName] of index.byName) {
    if (sameName.length > 1) {
      for (const node of sameName) {
        report(
          'warning',
          node,
          `The name "${node.name}" is used by ${sameName.length} nodes; references to it are ambiguous.`
        )
      }
    }
  }

  for (const node of nodes) {
    if (node.type === NodeType.Ghost) {
      continue
    }
    const typeName = NODE_TYPE_NAMES[node.type]

    if (!node.name?.trim()) {
      report('error', node, `A ${typeName} node has no name.`)
    } else if (/[\[\]]/.test(node.name)) {
      report('error', node, 'Node names must not contain square brackets.')
    }

    const references = checkReferences(node, index)
    for (const name of references.unknown) {
      report('error', node, `The equation references [${name}], but no node has that name.`)
    }
    for (const referenced of references.unlinked) {
      report(
        'error',
        node,
        `The equation references [${referenced.name}], but there is no link from that node to this one.`
      )
    }

    const isEmpty = (value: unknown) => value === undefined || value === null || value === ''
    if (node.type === NodeType.Stock && isEmpty(node.data.value)) {
      report('warning', node, 'The stock has no initial value (data.value).')
    }
    if (node.type === NodeType.Variable && isEmpty(node.data.value)) {
      report('warning', node, 'The variable has no value.')
    }
    if (node.type === NodeType.Flow) {
      if (isEmpty(node.data.rate)) {
        report('warning', node, 'The flow has no rate.')
      }
      if (incoming(node, EdgeType.Flow).length + outgoing(node, EdgeType.Flow).length === 0) {
        report('warning', node, 'The flow is connected to no stock, so it has no effect.')
      }
    }
    if (node.type === NodeType.Transition) {
      if (incoming(node, EdgeType.Transition).length + outgoing(node, EdgeType.Transition).length === 0) {
        report('warning', node, 'The transition is connected to no state, so it has no effect.')
      }
    }
    if (node.type === NodeType.Converter) {
      if (!Array.isArray(node.data.values) || node.data.values.length === 0) {
        report('warning', node, 'The converter has no lookup values.')
      }
      if (incoming(node, EdgeType.Link).length > 1) {
        report('error', node, 'A converter can have only one input link.')
      }
    }
    if (node.type === NodeType.OgcApiFeatures && isEmpty(node.data.collectionId)) {
      report('error', node, 'The geodata node has no collection (data.collectionId).')
    }
    if (node.type === NodeType.Population) {
      if (incoming(node, EdgeType.AgentPopulation).length === 0) {
        report('error', node, 'The population has no agent. Connect an agent with an agent-population edge.')
      }
      if (isEmpty(node.data.geoWidth) || isEmpty(node.data.geoHeight)) {
        report('error', node, 'The population needs a region: set data.geoWidth and data.geoHeight.')
      }
    }
  }

  return issues
}
