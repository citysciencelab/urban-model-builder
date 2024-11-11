import { NodeProps } from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo, useEffect, useState } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";

export const GhostNode = memo(({ data, isConnectable }: NodeProps) => {
  const [ghostNodeModel, setGhostNodeModel] = useState(null);

  useEffect(() => {
    const load = async () => {
      setGhostNodeModel(await (data.emberModel as any).ghostParent);
    };

    load().catch(console.error);
  }, [data]);

  let ghostName = useModelPropState({
    emberModel: ghostNodeModel,
    propertyName: "name",
  });

  return (
    <div className={`react-flow__node-default content`}>
      <DefaultNodeHandles isConnectable={isConnectable} />

      {ghostName}
    </div>
  );
});
