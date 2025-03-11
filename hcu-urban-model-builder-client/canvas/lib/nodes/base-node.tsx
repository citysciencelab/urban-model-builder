import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";
import { ReactFlowNodeType } from "../declarations.ts";
import { BaseNodeData } from "./base-node/data.tsx";

export const BaseNode = memo(
  ({ id, data, isConnectable, selected, type }: NodeProps) => {
    const handleType =
      type === ReactFlowNodeType.OgcApiFeatures ? "source" : undefined;

    return (
      <div className="react-flow__node-base__content">
        <DefaultNodeHandles type={handleType} isConnectable={isConnectable} />
        <NodeResizer isVisible={!!selected} />

        <BaseNodeData type={type} data={data} />

        <DefaultNodeToolbar
          nodeId={id}
          isNodeSelected={selected}
          allowGhost={true}
        />
      </div>
    );
  },
);
