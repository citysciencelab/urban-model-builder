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
import { ContainerCollapse } from "./container-collapse.tsx";

const positions = [
  Position.Top,
  Position.Bottom,
  Position.Left,
  Position.Right,
];

export const AgentNode = memo(
  ({ id, selected, data, type, isConnectable }: NodeProps) => {
    const emberModel = data["emberModel"] as any;
    const collapsed = Boolean(emberModel?.get("data.collapsed"));

    return (
      <div
        className={`react-flow__node-base__content react-flow__node-container${collapsed ? " --collapsed" : ""}`}
      >
        {/* handles */}
        {["source"].map((handleType: HandleType) =>
          positions.map((position) => (
            <Handle
              id={`${type}-${handleType}-${position}`}
              key={`${type}-${handleType}-${position}`}
              type={handleType}
              position={position}
              isConnectable={isConnectable}
            />
          )),
        )}
        <NodeResizer
          isVisible={!!selected && !collapsed}
          minWidth={216}
          minHeight={108}
        />
        <DefaultNodeToolbar nodeId={id} isNodeSelected={selected} />
        <ContainerCollapse
          id={id}
          type={type}
          data={data}
          disabled={!isConnectable}
        />
        {!collapsed && (
          <div className="react-flow__node-base__header">
            <div className="react-flow__node-base__icon">
              <Icon icon={"agent" as IconNames} />
            </div>
            <div className="react-flow__node-base__name">
              {emberModel?.get("name")}
            </div>
          </div>
        )}
      </div>
    );
  },
);
