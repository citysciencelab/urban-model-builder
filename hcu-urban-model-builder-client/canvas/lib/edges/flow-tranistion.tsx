import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Handle,
  HandleType,
  Position,
  useReactFlow,
} from "@xyflow/react";

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
}: EdgeProps & { type: string }) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const style =
    type === "flow"
      ? { stroke: "#a3c4ff", strokeWidth: "3px" }
      : { stroke: "#111111", strokeWidth: "3px" };

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
    </>
  );
}
