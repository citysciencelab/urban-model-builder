import {
  Handle,
  NodeProps,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useModelPropState } from "../utils/use-model-prop-state.tsx";
import { memo, useCallback, useContext, useMemo, useState } from "react";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";
import { EmberReactConnectorContext } from "../context/ember-react-connector.ts";

const positions = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
];

const oppositePosition = {
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
};

const nextDirection = {
  [Position.Top]: Position.Right,
  [Position.Right]: Position.Bottom,
  [Position.Bottom]: Position.Left,
  [Position.Left]: Position.Top,
};

export const ArrowNode = memo(
  ({ id, data, isConnectable, type, selected }: NodeProps<any>) => {
    const rfInstance = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();
    const emberReactConnector = useContext(EmberReactConnectorContext);

    const name = useModelPropState({
      emberModel: data.emberModel as any,
      propertyName: "name",
    });

    const [direction, setDirection] = useState<Position>(
      data.emberModel.data.direction || Position.Right,
    );

    const oppositeHandle = useMemo(() => {
      return oppositePosition[direction];
    }, [direction]);

    const normalTargetHandles = useMemo(() => {
      return positions.filter((p) => p !== oppositeHandle && p !== direction);
    }, [direction, oppositeHandle]);

    const onChangeDirection = useCallback(() => {
      const newDirection = nextDirection[direction];
      setDirection(newDirection);
      updateNodeInternals(id);
      emberReactConnector.save("node", id, {
        data: {
          ...data.emberModel.data,
          direction: newDirection,
        },
      });
    }, [direction, rfInstance]);

    return (
      <div className="react-flow__node-arrow__content">
        {normalTargetHandles.map((position) => (
          <Handle
            type={"target"}
            id={`target-${positions.indexOf(position) + 1 === positions.indexOf(direction) ? 0 : 1}`}
            key={`target-${position}`}
            position={position}
            isConnectable={isConnectable}
          />
        ))}

        <Handle
          type="target"
          id={`${type}-target`}
          position={oppositeHandle}
          key={oppositeHandle}
          className="react-flow__node-arrow__handle__target"
          isConnectable={isConnectable}
        />

        <Handle
          type="source"
          id={`${type}-source`}
          position={direction}
          className="react-flow__node-arrow__handle__source"
          isConnectable={isConnectable}
        />

        <div className="react-flow__node-flow__label">{name}</div>
        <DefaultNodeToolbar nodeId={id} isNodeSelected={selected}>
          <button onClick={onChangeDirection}>🔁</button>
        </DefaultNodeToolbar>
      </div>
    );
  },
);
