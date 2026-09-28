import type { Edge, Node } from '@xyflow/react';

// Fixed canvas layers: containers below edges, and all other primitives above.
export const CANVAS_CONTAINER_Z_INDEX = 0;
export const CANVAS_EDGE_Z_INDEX = 1;
export const CANVAS_PRIMITIVE_Z_INDEX = 2;

const getNodeZIndex = (node: Node) =>
  node.type === 'folder' || node.type === 'agent'
    ? CANVAS_CONTAINER_Z_INDEX
    : CANVAS_PRIMITIVE_Z_INDEX;

const isCollapsed = (node: Node, overrides?: Map<string, boolean>) => {
  if (node.type !== 'folder' && node.type !== 'agent') return false;
  const emberModel = node.data?.['emberModel'] as
    | { get?: (path: string) => unknown }
    | undefined;
  return (
    overrides?.get(node.id) ?? Boolean(emberModel?.get?.('data.collapsed'))
  );
};

const getHiddenNodeIds = (nodes: Node[], overrides?: Map<string, boolean>) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const hiddenNodeIds = new Set<string>();

  for (const node of nodes) {
    const visited = new Set<string>();
    let parentId = node.parentId;

    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = nodesById.get(parentId);
      if (!parent) break;

      if (isCollapsed(parent, overrides)) {
        hiddenNodeIds.add(node.id);
        break;
      }
      parentId = parent.parentId;
    }
  }

  return hiddenNodeIds;
};

export const applyContainerVisibility = (
  nodes: Node[],
  overrides?: Map<string, boolean>,
) => {
  const hiddenNodeIds = getHiddenNodeIds(nodes, overrides);
  return nodes.map((node) => {
    const hidden = hiddenNodeIds.has(node.id);
    const zIndex = getNodeZIndex(node);

    if (node.hidden === hidden && node.zIndex === zIndex) return node;

    const updatedNode = { ...node, hidden, zIndex } as Node & {
      __containerOriginalZIndex?: number | null;
    };
    // Clean up snapshots produced by the former collapse-specific layering.
    delete updatedNode.__containerOriginalZIndex;
    return updatedNode;
  });
};

/**
 * Re-routes edges so that collapsing a container never leaves an edge
 * pointing at a node or handle that no longer renders. Called with the same
 * `overrides` map passed to `applyContainerVisibility` so an optimistic,
 * not-yet-saved toggle is reflected consistently in both.
 */
export const applyContainerEdgeVisibility = (edges: Edge[], nodes: Node[]) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const visibleAncestor = (nodeId: string) => {
    let node = nodesById.get(nodeId);
    const visited = new Set<string>();

    while (node?.hidden && node.parentId && !visited.has(node.parentId)) {
      visited.add(node.parentId);
      node = nodesById.get(node.parentId);
    }

    return node?.hidden ? nodeId : (node?.id ?? nodeId);
  };

  type Role = 'source' | 'target';

  /**
   * Resolves one edge endpoint (source or target, independently of the
   * other) to where it should actually render: the nearest visible ancestor
   * if the endpoint node itself is hidden inside a collapsed container.
   */
  const resolveEndpoint = (
    nodeId: string,
    handleId: string | null,
    role: Role,
  ) => {
    const placeholder =
      role === 'source' ? 'collapsed-source' : 'collapsed-target';
    const ancestorId = visibleAncestor(nodeId);
    if (ancestorId !== nodeId) {
      return { nodeId: ancestorId, handleId: placeholder, projected: true };
    }

    return { nodeId, handleId, projected: false };
  };

  return edges.map((edge) => {
    const currentData = (edge.data || {}) as Record<string, unknown>;
    const hasOriginal = Object.prototype.hasOwnProperty.call(
      currentData,
      '__containerOriginalSource',
    );

    const originalSource = hasOriginal
      ? (currentData['__containerOriginalSource'] as string)
      : edge.source;
    const originalTarget = hasOriginal
      ? (currentData['__containerOriginalTarget'] as string)
      : edge.target;
    const originalSourceHandle = hasOriginal
      ? ((currentData['__containerOriginalSourceHandle'] as string | null) ??
        null)
      : (edge.sourceHandle ?? null);
    const originalTargetHandle = hasOriginal
      ? ((currentData['__containerOriginalTargetHandle'] as string | null) ??
        null)
      : (edge.targetHandle ?? null);
    const originalZIndex = hasOriginal
      ? (currentData['__containerOriginalZIndex'] as number | undefined)
      : edge.zIndex;
    const originalReconnectable = hasOriginal
      ? currentData['__containerOriginalReconnectable']
      : edge.reconnectable;

    const resolvedSource = resolveEndpoint(
      originalSource,
      originalSourceHandle,
      'source',
    );
    const resolvedTarget = resolveEndpoint(
      originalTarget,
      originalTargetHandle,
      'target',
    );
    const projected = resolvedSource.projected || resolvedTarget.projected;

    // Nothing to do: this edge was never projected and still resolves to
    // its own, real endpoints — keep the same reference so unaffected
    // edges don't re-render every time some other container is toggled.
    if (
      !hasOriginal &&
      !projected &&
      edge.zIndex === CANVAS_EDGE_Z_INDEX &&
      resolvedSource.nodeId === edge.source &&
      resolvedTarget.nodeId === edge.target &&
      resolvedSource.handleId === (edge.sourceHandle ?? null) &&
      resolvedTarget.handleId === (edge.targetHandle ?? null)
    ) {
      return edge;
    }

    const data = { ...currentData };
    delete data['__containerOriginalSource'];
    delete data['__containerOriginalTarget'];
    delete data['__containerOriginalSourceHandle'];
    delete data['__containerOriginalTargetHandle'];
    delete data['__containerOriginalZIndex'];
    delete data['__containerOriginalReconnectable'];

    if (projected) {
      data['__containerOriginalSource'] = originalSource;
      data['__containerOriginalTarget'] = originalTarget;
      data['__containerOriginalSourceHandle'] = originalSourceHandle;
      data['__containerOriginalTargetHandle'] = originalTargetHandle;
      data['__containerOriginalZIndex'] = originalZIndex;
      data['__containerOriginalReconnectable'] = originalReconnectable;
    }

    return {
      ...edge,
      source: resolvedSource.nodeId,
      target: resolvedTarget.nodeId,
      sourceHandle: resolvedSource.handleId,
      targetHandle: resolvedTarget.handleId,
      data,
      // Edges stay above folders/agents and below every other primitive,
      // including when a container is collapsed and an edge is projected.
      zIndex: CANVAS_EDGE_Z_INDEX,
      // A projected edge's visible endpoint is a stand-in, not the real
      // node/handle it was reconnected from/to — dragging it would silently
      // rewire the model to point at the container instead. Disable
      // reconnecting until the edge is unprojected again.
      reconnectable: projected
        ? false
        : ((originalReconnectable as Edge['reconnectable']) ??
          edge.reconnectable),
      // Only force-hide when projection collapsed two distinct endpoints
      // into the same visible node; leave a genuine (non-collapse) self-loop
      // alone.
      hidden: projected && resolvedSource.nodeId === resolvedTarget.nodeId,
    };
  });
};
