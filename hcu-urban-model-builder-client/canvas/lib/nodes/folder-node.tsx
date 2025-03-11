import {
  Handle,
  HandleType,
  NodeProps,
  NodeResizer,
  Position,
} from "@xyflow/react";
import { memo } from "react";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";
import { Icon, IconNames } from "../utils/icon.tsx";

export const FolderNode = memo(
  ({ id, selected, data, type, isConnectable }: NodeProps) => {
    const emberModel = data.emberModel;

    return (
      <div className="react-flow__node-base__content">
        <NodeResizer isVisible={!!selected} minWidth={216} minHeight={108} />
        <DefaultNodeToolbar nodeId={id} isNodeSelected={selected} position="right" />
        <div className="react-flow__node-base__header">
          <div className="react-flow__node-base__icon">
            <Icon icon={"folder" as IconNames} />
          </div>
          <div className="react-flow__node-base__name">
            {emberModel?.get("name")}
          </div>
        </div>
      </div>
    );
  },
);
