import type { EdgeChange, NodeChange } from '@xyflow/react';

// Only adding, removing or replacing nodes and edges can change what the model
// check reports. React Flow also fires `select`, `position` and `dimensions`
// changes - the latter for every node when it is first measured after the
// canvas mounts - and re-checking on those ran a full simulation while a model
// was merely being opened or a node being dragged.
const STRUCTURAL_CHANGE_TYPES: ReadonlySet<string> = new Set([
  'add',
  'remove',
  'replace',
]);

export function changesRequireValidation(
  changes: ReadonlyArray<NodeChange | EdgeChange>,
): boolean {
  return changes.some((change) => STRUCTURAL_CHANGE_TYPES.has(change.type));
}

type ValidatableNode = {
  id: string;
  data?: { validationError?: string | null } & Record<string, unknown>;
};

/**
 * Sets each node's `data.validationError` from `errors`. Only nodes whose
 * marker changes get a new object, and the input array itself is returned
 * when nothing changed, so React Flow does not re-render every node after
 * each check.
 */
export function applyValidationErrors<T extends ValidatableNode>(
  nodes: T[],
  errors: Record<string, string>,
): T[] {
  let changed = false;
  const next = nodes.map((node) => {
    const validationError = errors[node.id] ?? null;
    if ((node.data?.validationError ?? null) === validationError) {
      return node;
    }
    changed = true;
    return { ...node, data: { ...node.data, validationError } };
  });
  return changed ? next : nodes;
}
