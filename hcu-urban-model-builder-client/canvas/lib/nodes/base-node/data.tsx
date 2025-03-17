import { memo, useContext, useMemo } from "react";
import { reactFlowNodeToNodeType, ReactFlowNodeType } from "../../declarations";
import { Icon, IconNames } from "../../utils/icon.tsx";
import { NodeParamsMapContext } from "../../context/node-params-map.tsx";
import {
  NODE_TYPE_TO_PARAMETER_NAME_MAP,
  NodeType,
} from "hcu-urban-model-builder-backend";

interface EmberModel {
  // eslint-disable-next-line no-unused-vars
  get(key: string): any;
}

interface BaseNodeDataProps {
  id: string;
  type: string;
  data: {
    emberModel?: EmberModel;
  };
}

type NodeData = Record<string, any>;

const tagsNodeMap: Record<string, (data: NodeData) => string[]> = {
  [ReactFlowNodeType.Variable]: (data: NodeData) => {
    const value = data.value;

    if (!value) {
      return [];
    }
    const unit = data.units;
    return [unit ? `${value} ${unit}` : `${value}`];
  },

  [ReactFlowNodeType.Stock]: (data: NodeData) => {
    const value = data.value;

    if (!value) {
      return [];
    }
    const unit = data.units;
    return [unit ? `${value} ${unit}` : `${value}`];
  },

  [ReactFlowNodeType.OgcApiFeatures]: (data: NodeData) => {
    const url = data.collectionId;
    if (!url) {
      return [];
    }

    const properties = data.query?.properties;
    if (!properties || properties.length === 0) {
      return [url];
    }

    return [url, properties.join(", ")];
  },

  [ReactFlowNodeType.Population]: (data: NodeData) => {
    const populationSize = data.populationSize;

    const placementType = data.geoPlacementType;

    return [populationSize, placementType].filter((v) => !!v);
  },

  [ReactFlowNodeType.State]: (data: NodeData) => {
    const startActive = data.startActive;
    if (!startActive) {
      return [];
    }
    return [startActive];
  },

  [ReactFlowNodeType.Action]: (data: NodeData) => {
    const action = data.action;
    if (!action) {
      return [];
    }

    const trigger = data.trigger;
    if (!trigger) {
      return [];
    }
    return [action, trigger];
  },
};

const isParamKey = (
  type: NodeType,
): type is keyof typeof NODE_TYPE_TO_PARAMETER_NAME_MAP => {
  return type in NODE_TYPE_TO_PARAMETER_NAME_MAP;
};

export const BaseNodeData = memo(({ id, type, data }: BaseNodeDataProps) => {
  const nodeParamsMap = useContext(NodeParamsMapContext);
  const emberModel = data.emberModel;

  const tags = useMemo(() => {
    if (emberModel) {
      const tagsFn = tagsNodeMap[type];
      const data = emberModel.get("data");
      if (data && tagsFn) {
        const dataCopy = { ...data };
        if (nodeParamsMap && nodeParamsMap.has(id)) {
          const backendType = reactFlowNodeToNodeType(type as any);
          if (isParamKey(backendType)) {
            const key = NODE_TYPE_TO_PARAMETER_NAME_MAP[backendType];
            dataCopy[key] = nodeParamsMap.get(id);
          }
        }

        return tagsFn(dataCopy);
      }
    }
    return [];
  }, [data, nodeParamsMap]);

  return (
    <>
      <div className="react-flow__node-base__header">
        <div className="react-flow__node-base__icon">
          <Icon icon={type as IconNames} />
        </div>
        <div className="react-flow__node-base__name">
          {emberModel?.get("name")}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="react-flow__node-base__footer">
          <div className="react-flow__node-base--tags">
            {tags.map((tag) => (
              <div className="react-flow__node-base--single-tag" key={tag}>
                {tag}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
});
