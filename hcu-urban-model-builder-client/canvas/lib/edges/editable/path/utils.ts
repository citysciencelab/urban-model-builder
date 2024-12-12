import type { XYPosition } from '@xyflow/react';

import type { ControlPointData } from '../control-point';

export const isControlPoint = (
  point: ControlPointData | XYPosition,
): point is ControlPointData => 'id' in point;
