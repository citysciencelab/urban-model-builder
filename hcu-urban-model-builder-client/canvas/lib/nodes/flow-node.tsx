import { Handle, HandleType, NodeProps, Position } from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo } from "react";

export const FlowNode = memo(({ data, isConnectable }: NodeProps) => {
  const positions = [
    Position.Top,
    Position.Bottom,
    // Position.Left,
    // Position.Right,
  ];

  const name = useModelPropState({
    emberModel: data.emberModel as any,
    propertyName: "name",
  });

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
      <div className="react-flow__node-flow__label">{name}</div>
    </div>
  );
});
