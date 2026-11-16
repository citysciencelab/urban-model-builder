import { dasherize } from '@ember/string';
import { NodeType } from 'hcu-urban-model-builder-backend';

/**
 * Summary of a model version's graph for the Library: the node-mix bar
 * (shares of node types in their colours) and the thumbnail (nodes as blocks
 * in their colours and forms, generated from node positions).
 *
 * Pure functions, no store access: the Library fetches a slim node list per
 * card and passes it in.
 */

/** The fields of a node the summary needs. */
export interface SummaryNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  parentId?: string | null;
  width?: number | null;
  height?: number | null;
}

export type Paradigm = 'sd' | 'abm' | 'geo';

/** Node type names as used in class names and tokens (`node-stock`, …). */
export type NodeTypeName = string;

export interface MixSegment {
  type: NodeTypeName;
  count: number;
  /** Start and width in percent of the bar. */
  offset: number;
  share: number;
}

export interface ParadigmShare {
  paradigm: Paradigm;
  /** Whole percent; the shares of a model add up to 100. */
  percent: number;
}

export interface ThumbnailShape {
  id: string;
  type: NodeTypeName;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export interface ModelSummary {
  /** All nodes of the version except ghosts (references to other nodes). */
  nodeCount: number;
  segments: MixSegment[];
  paradigms: ParadigmShare[];
  shapes: ThumbnailShape[];
}

// Order of the segments in the bar, grouped by paradigm.
const PARADIGM_TYPES: Record<Paradigm, NodeType[]> = {
  sd: [NodeType.Stock, NodeType.Flow, NodeType.Variable, NodeType.Converter],
  geo: [NodeType.OgcApiFeatures],
  abm: [
    NodeType.State,
    NodeType.Transition,
    NodeType.Action,
    NodeType.Population,
    NodeType.Agent,
  ],
};

const PARADIGM_ORDER: Paradigm[] = ['sd', 'abm', 'geo'];

export const THUMBNAIL_WIDTH = 300;
export const THUMBNAIL_HEIGHT = 150;
const THUMBNAIL_PADDING = 16;
// Models with only a few nodes are not blown up to fill the sheet.
const THUMBNAIL_MAX_SCALE = 0.4;
const THUMBNAIL_MAX_SHAPES = 400;

// Sizes on the canvas for nodes that do not store their own.
const DEFAULT_NODE_SIZE = { width: 160, height: 56 };
const ARROW_NODE_SIZE = { width: 120, height: 12 };
const GROUP_NODE_SIZE = { width: 216, height: 108 };

const ARROW_TYPES = [NodeType.Flow, NodeType.Transition];
const GROUP_TYPES = [NodeType.Folder, NodeType.Agent];

export function nodeTypeName(type: NodeType): NodeTypeName {
  return dasherize(NodeType[type] ?? 'unknown');
}

/** Rounds shares to whole percents that still add up to 100. */
export function roundToHundred(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return counts.map(() => 0);
  }
  const exact = counts.map((count) => (count / total) * 100);
  const rounded = exact.map(Math.floor);
  let remaining = 100 - rounded.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const { index } of byRemainder) {
    if (remaining <= 0) {
      break;
    }
    rounded[index]! += 1;
    remaining -= 1;
  }
  return rounded;
}

function nodeMix(nodes: SummaryNode[]) {
  const counts = new Map<NodeType, number>();
  for (const node of nodes) {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
  }

  const paradigmCounts = PARADIGM_ORDER.map((paradigm) =>
    PARADIGM_TYPES[paradigm].reduce(
      (sum, type) => sum + (counts.get(type) ?? 0),
      0,
    ),
  );
  const total = paradigmCounts.reduce((sum, count) => sum + count, 0);

  const segments: MixSegment[] = [];
  let offset = 0;
  for (const paradigm of ['sd', 'geo', 'abm'] as Paradigm[]) {
    for (const type of PARADIGM_TYPES[paradigm]) {
      const count = counts.get(type) ?? 0;
      if (count > 0) {
        const share = (count / total) * 100;
        segments.push({ type: nodeTypeName(type), count, offset, share });
        offset += share;
      }
    }
  }

  const percents = roundToHundred(paradigmCounts);
  const paradigms = PARADIGM_ORDER.map((paradigm, index) => ({
    paradigm,
    percent: percents[index]!,
  })).filter(({ percent }) => percent > 0);

  return { segments, paradigms };
}

function nodeSize(node: SummaryNode) {
  if (node.width && node.height) {
    return { width: node.width, height: node.height };
  }
  if (ARROW_TYPES.includes(node.type)) {
    return ARROW_NODE_SIZE;
  }
  if (GROUP_TYPES.includes(node.type)) {
    return GROUP_NODE_SIZE;
  }
  return DEFAULT_NODE_SIZE;
}

// Radius of a node form on the canvas (see `$node-radius-map`).
function nodeRadius(type: NodeType, height: number) {
  switch (type) {
    case NodeType.Variable:
      return height / 2;
    case NodeType.State:
      return 14;
    case NodeType.Converter:
    case NodeType.Action:
    case NodeType.OgcApiFeatures:
      return 6;
    default:
      return 0;
  }
}

function thumbnailShapes(nodes: SummaryNode[]): ThumbnailShape[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  // Child nodes of folders and agents are positioned relative to their parent.
  const absolutePosition = (node: SummaryNode) => {
    let { x, y } = node.position;
    const seen = new Set([node.id]);
    let parent = node.parentId ? byId.get(node.parentId) : undefined;
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id);
      x += parent.position.x;
      y += parent.position.y;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return { x, y };
  };

  const boxes = nodes
    .filter((node) => node.position)
    .slice(0, THUMBNAIL_MAX_SHAPES)
    .map((node) => ({ node, ...absolutePosition(node), ...nodeSize(node) }));

  if (boxes.length === 0) {
    return [];
  }

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const scale = Math.min(
    (THUMBNAIL_WIDTH - 2 * THUMBNAIL_PADDING) / (maxX - minX),
    (THUMBNAIL_HEIGHT - 2 * THUMBNAIL_PADDING) / (maxY - minY),
    THUMBNAIL_MAX_SCALE,
  );
  const offsetX = (THUMBNAIL_WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (THUMBNAIL_HEIGHT - (maxY - minY) * scale) / 2;
  const round = (value: number) => Math.round(value * 10) / 10;

  return (
    boxes
      // Group frames first, so their children are drawn on top.
      .sort(
        (a, b) =>
          Number(GROUP_TYPES.includes(b.node.type)) -
          Number(GROUP_TYPES.includes(a.node.type)),
      )
      .map(({ node, x, y, width, height }) => ({
        id: node.id,
        type: nodeTypeName(node.type),
        x: round(offsetX + (x - minX) * scale),
        y: round(offsetY + (y - minY) * scale),
        width: round(Math.max(width * scale, 3)),
        height: round(Math.max(height * scale, 2)),
        rx: round(nodeRadius(node.type, height) * scale),
      }))
  );
}

export function summarizeNodes(allNodes: SummaryNode[]): ModelSummary {
  const nodes = allNodes.filter((node) => node.type !== NodeType.Ghost);

  return {
    nodeCount: nodes.length,
    ...nodeMix(nodes),
    shapes: thumbnailShapes(nodes),
  };
}
