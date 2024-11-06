import { Handle, HandleType, Position } from "@xyflow/react";
import { memo } from "react";

export const DefaultNodeHandles = memo(
  ({ isConnectable }: { isConnectable: boolean }) => {
    const positions = [
      Position.Top,
      Position.Bottom,
      Position.Left,
      Position.Right,
    ];
    return (
      <>
        {["target", "source"].map((type: HandleType) =>
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
      </>
    );
  },
);
