import { NodeProps } from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";

export const OgcApiFeaturesNode = memo(({ data, isConnectable }: NodeProps) => {
  const name = useModelPropState({
    emberModel: data.emberModel as any,
    propertyName: "name",
  });

  return (
    <div className={`react-flow__node-default content`}>
      <DefaultNodeHandles type="source" isConnectable={isConnectable} />

      {name}
    </div>
  );
});
