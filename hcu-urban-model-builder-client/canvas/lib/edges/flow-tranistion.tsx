import { useMemo } from "react";
import { BaseEdge, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

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
  data,
}: EdgeProps & { type: string }) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const hasMarkerEnd = useMemo(() => {
    const originalSourceHandle = (
      data as Record<string, unknown> | undefined
    )?.["__containerOriginalSourceHandle"] as string | undefined;
    const effectiveSourceHandle = originalSourceHandle || sourceHandleId;
    return (
      effectiveSourceHandle?.startsWith("transition") ||
      effectiveSourceHandle?.startsWith("flow")
    );
  }, [sourceHandleId, data]);

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
