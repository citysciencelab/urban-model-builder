import { Handle, HandleType, NodeProps, Position } from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo, useEffect, useState } from "react";

export const GhostNode = memo(({ id, data, isConnectable }: NodeProps) => {
  const positions = [
    Position.Top,
    Position.Bottom,
    Position.Left,
    Position.Right,
  ];

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
      {ghostName}
    </div>
  );
});
