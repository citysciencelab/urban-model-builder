import { Handle, HandleType, Position } from "@xyflow/react";
import { memo } from "react";

export const DefaultNodeHandles = memo(
  (props: { isConnectable: boolean; type?: "target" | "source" }) => {
    const positions = [
      Position.Top,
      Position.Bottom,
      Position.Left,
      Position.Right,
    ];

    const types = props.type ? [props.type] : ["target", "source"];

    return (
      <>
        {types.map((type: HandleType) =>
          positions.map((position) => (
            <Handle
              id={`${type}-${position}`}
              key={`${type}-${position}`}
              type={type}
              position={position}
              isConnectable={props.isConnectable}
            />
          )),
        )}
      </>
    );
  },
);
