import { NodeProps } from "@xyflow/react";
import { memo, useEffect, useMemo, useState } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";
import { NodeType } from "hcu-urban-model-builder-backend";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";
import { nodeTypeToReactFlowNode, ReactFlowNodeType } from "../declarations.ts";
import { BaseNodeData } from "./base-node/data.tsx";

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

    const parentType = useMemo(() => {
      if (!ghostNodeModel) {
        return null;
      }

      return nodeTypeToReactFlowNode(ghostNodeModel?.get("type"));
    }, [ghostNodeModel]);

    return (
      <div className={`react-flow__node-ghost__content --type-${parentType}`}>
        <DefaultNodeHandles isConnectable={isConnectable} type={handelType} />
        {parentType && (
          <BaseNodeData
            type={parentType}
            data={{ emberModel: ghostNodeModel }}
          />
        )}

        <DefaultNodeToolbar nodeId={id} isNodeSelected={selected} />
      </div>
    );
  },
);
