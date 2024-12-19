import {
  Handle,
  HandleType,
  NodeProps,
  NodeResizer,
  Position,
} from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo } from "react";
import { ReactFlowNodeType } from "../declarations.ts";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";

const positions = [
  Position.Top,
  Position.Bottom,
  Position.Left,
  Position.Right,
];

export const FolderNode = memo(
  ({ id, selected, data, type, isConnectable }: NodeProps) => {
    const name = useModelPropState({
      emberModel: data.emberModel as any,
      propertyName: "name",
    });

    return (
      <div className="react-flow__node-folder__content">
        {type === ReactFlowNodeType.Agent &&
          ["source"].map((handleType: HandleType) =>
            positions.map((position) => (
              <Handle
                id={`${type}-${handleType}-${position}`}
                key={`${type}-${handleType}-${position}`}
                type={handleType}
                position={position}
                isConnectable={isConnectable}
              />
            )),
          )}
        <NodeResizer isVisible={!!selected} />
        <div>{name}</div>
        <DefaultNodeToolbar nodeId={id} isNodeSelected={selected} />
      </div>
    );
  },
);
