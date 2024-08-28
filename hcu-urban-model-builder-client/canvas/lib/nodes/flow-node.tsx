import {
  Handle,
  HandleType,
  NodeProps,
  Position,
  useConnection,
  useHandleConnections,
} from "@xyflow/react";
import { memo } from "react";

export const FlowNode = memo(({ id, data, isConnectable }: NodeProps) => {
  const positions = [
    Position.Top,
    Position.Bottom,
    // Position.Left,
    // Position.Right,
  ];

  const connections = useConnection();

  console.log("connections", connections);

  return (
    <div>
      {["target"].map((type: HandleType) =>
        positions.map((position) => (
          <Handle
            id={`${type}-${position}`}
            key={`${type}-${position}`}
            type={type}
            position={position}
            isConnectable={isConnectable}
          />
        )),
      )}
      <Handle
        type="target"
        id="flow-target"
        position={Position.Left}
        style={{ background: "red" }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        id="flow-source"
        position={Position.Right}
        style={{ background: "red" }}
        isConnectable={isConnectable}
      />
      <div className="react-flow__node-flow__label">{data.label as string}</div>
    </div>
  );
});
