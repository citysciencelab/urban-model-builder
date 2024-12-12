import { type XYPosition, Position } from '@xyflow/react';
import type { ControlPointData } from '../control-point.tsx';

import { getCatmullRomPath, getCatmullRomControlPoints } from './catmull-rom';

export function getControlPoints(
  points: (ControlPointData | XYPosition)[],
  sides = { fromSide: Position.Left, toSide: Position.Right },
) {
  return getCatmullRomControlPoints(points, true, sides);
}

export function getPath(
  points: XYPosition[],
  sides = { fromSide: Position.Left, toSide: Position.Right },
) {
  return getCatmullRomPath(points, true, sides);
}
