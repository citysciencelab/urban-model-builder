import { NodeType } from '../services/nodes/nodes.shared.js'

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
