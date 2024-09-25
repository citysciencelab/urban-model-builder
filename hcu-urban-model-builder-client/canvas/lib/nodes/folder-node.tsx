import { NodeProps, NodeResizer } from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo } from "react";

export const FolderNode = memo(({ id, selected, data }: NodeProps) => {
  const name = useModelPropState({
    emberModel: data.emberModel as any,
    propertyName: "name",
  });

  return (
    <>
      <NodeResizer color="#ff0071" isVisible={!!selected} />
      <div>
        Group: {name} (id: {id})
      </div>
    </>
  );
});
