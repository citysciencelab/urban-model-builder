import {
  Handle,
  HandleType,
  NodeProps,
  NodeToolbar,
  Position,
} from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo, useContext } from "react";
import { EmberReactConnectorContext } from "../context/ember-react-connector.ts";
import { NodeType } from "hcu-urban-model-builder-backend";

export const BaseNode = memo(
  ({
    id,
    data,
    isConnectable,
    selected,
    positionAbsoluteX,
    positionAbsoluteY,
  }: NodeProps) => {
    const positions = [
      Position.Top,
      Position.Bottom,
      Position.Left,
      Position.Right,
    ];

    const emberReactConnector = useContext(EmberReactConnectorContext);

    const name = useModelPropState({
      emberModel: data.emberModel as any,
      propertyName: "name",
    });

    const createGhost = async () => {
      await emberReactConnector.create("node", {
        type: NodeType.Ghost,
        ghostParentId: id,
        position: {
          x: positionAbsoluteX + 10,
          y: positionAbsoluteY + 10,
        },
        data: {},
      });
    };

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

        {name}

        <NodeToolbar isVisible={selected} position={Position.Top}>
          <button onClick={createGhost}>👻</button>
        </NodeToolbar>
      </div>
    );
  },
);
