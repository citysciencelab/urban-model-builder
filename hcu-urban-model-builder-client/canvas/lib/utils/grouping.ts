import { Node } from '@xyflow/react';

export const compareParentId = (a: string, b: string) => {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return -1;
  }
  if (b === null) {
    return 1;
  }

  return a < b ? -1 : 1;
};

export const sortNodeModels = (a: any, b: any) => {
  const parentIdA = a.raw.parentId;
  const parentIdB = b.raw.parentId;

  return compareParentId(parentIdA, parentIdB);
};

export const sortNodes = (a: Node, b: Node): number => {
  return compareParentId(a.parentId, b.parentId);
};

export const getNodePositionInsideParent = (
  node: Partial<Node>,
  groupNode: Node,
) => {
  const position = node.position ?? { x: 0, y: 0 };
  const nodeWidth = node.measured?.width ?? 0;
  const nodeHeight = node.measured?.height ?? 0;
  const groupWidth = groupNode.measured?.width ?? 0;
  const groupHeight = groupNode.measured?.height ?? 0;

  if (position.x < groupNode.position.x) {
    position.x = 0;
  } else if (position.x + nodeWidth > groupNode.position.x + groupWidth) {
    position.x = groupWidth - nodeWidth;
  } else {
    position.x = position.x - groupNode.position.x;
  }

  if (position.y < groupNode.position.y) {
    position.y = 0;
  } else if (position.y + nodeHeight > groupNode.position.y + groupHeight) {
    position.y = groupHeight - nodeHeight;
  } else {
    position.y = position.y - groupNode.position.y;
  }

  return position;
};

export const getNodePositionOutsideParent = (
  node: Partial<Node>,
  groupNode: Node,
) => {
  return {
    x: groupNode.position.x + node.position.x,
    y: groupNode.position.y + node.position.y,
  };
};
