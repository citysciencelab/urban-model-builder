import {
  Handle,
  NodeProps,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { memo, useCallback, useContext, useMemo, useState } from "react";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";
import { EmberReactConnectorContext } from "../context/ember-react-connector.ts";
import { ReactFlowNodeType } from "../declarations.ts";
import { Icon, IconNames } from "../utils/icon.tsx";

interface EmberModel {
  get(key: string): any;
}

const tagsNodeMap: Record<string, (emberModel: EmberModel) => string[]> = {
  [ReactFlowNodeType.Flow]: (emberModel: EmberModel) => {
    const rate = emberModel.get("data.rate");

    if (!rate) {
      return [];
    }
    return [rate];
  },

  [ReactFlowNodeType.Transition]: (emberModel: EmberModel) => {
    const value = emberModel.get("data.value");

    if (!value) {
      return [];
    }
    const unit = emberModel.get("data.units");
    return [unit ? `${value} ${unit}` : `${value}`];
  },
};

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
    const emberModel = data.emberModel as EmberModel | undefined;

    const name = data.emberModel.get("name");

    const tags = useMemo(() => {
      if (emberModel) {
        const tagsFn = tagsNodeMap[type];
        if (tagsFn) {
          return tagsFn(emberModel);
        }
      }
      return [];
    }, [data]);

    const [direction, setDirection] = useState<Position>(
      data.emberModel.data.direction || Position.Right,
    );

    const oppositeHandle = useMemo(() => {
      return oppositePosition[direction];
    }, [direction]);

    const normalTargetHandles = useMemo(() => {
      return positions.filter((p) => p !== oppositeHandle && p !== direction);
    }, [direction, oppositeHandle]);

    const isHorizontal = useMemo(() => {
      return direction === Position.Left || direction === Position.Right;
    }, [direction]);

    const isVertical = useMemo(() => {
      return direction === Position.Top || direction === Position.Bottom;
    }, [direction]);

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

    const SpecialHandle = () => (
      <>
        <Handle
          type="target"
          id={`${type}-target`}
          position={oppositeHandle}
          key={oppositeHandle}
          className="react-flow__node-arrow__handle__target"
          isConnectable={isConnectable}
        >
          <Icon icon="chevron-right" />
        </Handle>
        <Handle
          type="source"
          id={`${type}-source`}
          position={direction}
          className="react-flow__node-arrow__handle__source"
          isConnectable={isConnectable}
        >
          <Icon icon="chevron-right" />
        </Handle>
      </>
    );

    return (
      <div
        className={
          "react-flow__node-arrow__content " + `--direction-${direction}`
        }
      >
        {normalTargetHandles.map((position) => (
          <Handle
            type={"target"}
            id={`target-${positions.indexOf(position) + 1 === positions.indexOf(direction) ? 0 : 1}`}
            key={`target-${position}`}
            position={position}
            isConnectable={isConnectable}
          />
        ))}

        {isVertical && <SpecialHandle />}

        <div className="react-flow__node-arrow__header">
          <div className="react-flow__node-arrow__icon">
            <Icon icon={type as IconNames} />
          </div>
          <div className="react-flow__node-arrow__name">{name}</div>
          {isHorizontal && <SpecialHandle />}
        </div>
        {tags.length > 0 && (
          <div className="react-flow__node-arrow__footer">
            <div className="react-flow__node-base--tags">
              {tags.map((tag) => (
                <div className="react-flow__node-base--single-tag" key={tag}>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        )}
        <DefaultNodeToolbar nodeId={id} isNodeSelected={selected}>
          <button onClick={onChangeDirection}>🔁</button>
        </DefaultNodeToolbar>
      </div>
    );
  },
);
