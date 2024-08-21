import { Handle, HandleType, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

export const BaseNode = memo(({ data, isConnectable }: NodeProps) => {
  const positions = [
    Position.Top,
    Position.Bottom,
    Position.Left,
    Position.Right,
  ];

  return (
    <div className="react-flow__node-default">
      {["target", "source"].map((type: HandleType) =>
        positions.map((position) => (
          <Handle
            id={`${type}-${position}`}
            key={`${type}-${position}`}
            type={type}
            position={position}
          />
        )),
      )}

      {data.label as string}
    </div>
  );
});
