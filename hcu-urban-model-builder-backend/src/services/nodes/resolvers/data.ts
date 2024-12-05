import { Nodes } from '../nodes.schema.js'
import { NodeType } from '../nodes.shared.js'

const defaultNodeDataByType = {
  [NodeType.OgcApiFeatures]: {
    query: {
      limit: 100,
      offset: 0,
      properties: [],
      skipGeometry: true
    }
  }
} satisfies Partial<Record<NodeType, Nodes['data']>>

const hasDefaultForNodeType = (type: NodeType): type is keyof typeof defaultNodeDataByType =>
  type in defaultNodeDataByType

export const nodeDataResolver = (inputData: Nodes['data'] | undefined, node: Nodes) => {
  const data: Nodes['data'] = inputData ?? {}
  const type = node.type
  if (hasDefaultForNodeType(type)) {
    return {
      ...defaultNodeDataByType[type],
      ...data
    }
  }
  return data
}
