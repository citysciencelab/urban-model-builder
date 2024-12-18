import { NodeProps, NodeResizer } from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";
import { ReactFlowNodeType } from "../declarations.ts";

export const BaseNode = memo(
  ({ id, data, isConnectable, selected, type }: NodeProps) => {
    const name = useModelPropState({
      emberModel: data.emberModel as any,
      propertyName: "name",
    });

    const handleType =
      type === ReactFlowNodeType.OgcApiFeatures ? "source" : undefined;

    return (
      <div className="react-flow__node-base__content">
        <DefaultNodeHandles type={handleType} isConnectable={isConnectable} />
        <NodeResizer isVisible={!!selected} />

        <div className="react-flow__node-base__name">{name}</div>

        <DefaultNodeToolbar
          nodeId={id}
          isNodeSelected={selected}
          allowGhost={true}
        />
      </div>
    );
  },
);
