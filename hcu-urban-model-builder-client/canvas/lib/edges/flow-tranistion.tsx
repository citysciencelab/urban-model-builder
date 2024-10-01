import { useMemo } from "react";
import { BaseEdge, EdgeProps, getSmoothStepPath } from "@xyflow/react";

export function FlowTransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  type,
  sourceHandleId,
}: EdgeProps & { type: string }) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const hasMarkerEnd = useMemo(
    () =>
      sourceHandleId.startsWith("transition") ||
      sourceHandleId.startsWith("flow"),
    [sourceHandleId],
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={hasMarkerEnd ? markerEnd : undefined}
      />
    </>
  );
}
