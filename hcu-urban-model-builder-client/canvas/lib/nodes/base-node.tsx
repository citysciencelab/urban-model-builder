import { NodeProps } from "@xyflow/react";
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
      <div
        className={`react-flow__node-base__content${
          data.validationError ? " --invalid" : ""
        }`}
      >
        <DefaultNodeHandles type={handleType} isConnectable={isConnectable} />

        <BaseNodeData id={id} type={type} data={data} />

        {data.validationError && (
          <div className="react-flow__node-validation-warning" title={data.validationError}>
            !
          </div>
        )}

        <DefaultNodeToolbar
          nodeId={id}
          isNodeSelected={selected}
          allowGhost={true}
        />
      </div>
    );
  },
);
