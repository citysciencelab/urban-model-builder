import { Handle, HandleType, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

export const FlowNode = memo(({ data, isConnectable }: NodeProps) => {
  const positions = [Position.Top, Position.Bottom];

  return (
    <div>
      <Handle
        type="source"
        id="flow-right"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
});
