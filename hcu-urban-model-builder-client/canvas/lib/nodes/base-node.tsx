import { NodeProps } from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";

export const BaseNode = memo(
  ({ id, data, isConnectable, selected }: NodeProps) => {
    const name = useModelPropState({
      emberModel: data.emberModel as any,
      propertyName: "name",
    });

    return (
      <div className={`react-flow__node-default content`}>
        <DefaultNodeHandles isConnectable={isConnectable} />

        {name}

        <DefaultNodeToolbar
          nodeId={id}
          isNodeSelected={selected}
          allowGhost={true}
        />
      </div>
    );
  },
);
