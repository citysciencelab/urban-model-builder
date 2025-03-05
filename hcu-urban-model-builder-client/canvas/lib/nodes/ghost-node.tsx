import { NodeProps } from "@xyflow/react";
import { memo, useEffect, useMemo, useState } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";
import { NodeType } from "hcu-urban-model-builder-backend";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";

export const GhostNode = memo(
  ({ id, data, isConnectable, selected }: NodeProps) => {
    const [ghostNodeModel, setGhostNodeModel] = useState(null);

    useEffect(() => {
      const load = async () => {
        setGhostNodeModel(await (data.emberModel as any).ghostParent);
      };

      load().catch(console.error);
    }, [data]);

    const handelType = useMemo((): "source" | undefined => {
      if (!ghostNodeModel) {
        return undefined;
      }

      return ghostNodeModel.type === NodeType.OgcApiFeatures
        ? "source"
        : undefined;
    }, [ghostNodeModel]);

    let ghostName = data.emberModel.get("name");

    return (
      <div className={`react-flow__node-default content`}>
        <DefaultNodeHandles isConnectable={isConnectable} type={handelType} />

        {ghostName}

        <DefaultNodeToolbar nodeId={id} isNodeSelected={selected} />
      </div>
    );
  },
);
