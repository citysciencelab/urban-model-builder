import { NodeResizer, NodeTypes } from "@xyflow/react";
import { DefaultNodeHandles } from "lib/utils/default-node-handles";
import { memo, useMemo } from "react";
import { ReactFlowNodeType } from "../../declarations";
import { Icon, IconNames } from "../../utils/icon.tsx";

interface EmberModel {
  get(key: string): any;
}

interface BaseNodeDataProps {
  type: string;
  data: {
    emberModel?: EmberModel;
  };
}

const tagsNodeMap: Record<string, (emberModel: EmberModel) => string[]> = {
  [ReactFlowNodeType.Variable]: (emberModel: EmberModel) => {
    const value = emberModel.get("data.value");

    if (!value) {
      return [];
    }
    const unit = emberModel.get("data.units");
    return [unit ? `${value} ${unit}` : `${value}`];
  },

  [ReactFlowNodeType.Stock]: (emberModel: EmberModel) => {
    const value = emberModel.get("data.value");

    if (!value) {
      return [];
    }
    const unit = emberModel.get("data.units");
    return [unit ? `${value} ${unit}` : `${value}`];
  },

  [ReactFlowNodeType.OgcApiFeatures]: (emberModel: EmberModel) => {
    const url = emberModel.get("data.collectionId");
    if (!url) {
      return [];
    }

    const properties = emberModel.get("data.query.properties");
    if (!properties || properties.length === 0) {
      return [url];
    }

    return [url, properties.join(", ")];
  },
  [ReactFlowNodeType.Population]: (emberModel: EmberModel) => {
    const populationSize = emberModel.get("data.populationSize");

    const placementType = emberModel.get("data.geoPlacementType");

    return [populationSize, placementType].filter((v) => !!v);
  },

  [ReactFlowNodeType.State]: (emberModel: EmberModel) => {
    const startActive = emberModel.get("data.startActive");
    if (!startActive) {
      return [];
    }
    return [startActive];
  },

  [ReactFlowNodeType.Action]: (emberModel: EmberModel) => {
    const action = emberModel.get("data.action");
    if (!action) {
      return [];
    }

    const trigger = emberModel.get("data.trigger");
    if (!trigger) {
      return [];
    }
    return [action, trigger];
  },
};

export const BaseNodeData = memo(({ type, data }: BaseNodeDataProps) => {
  const emberModel = data.emberModel;

  const tags = useMemo(() => {
    if (emberModel) {
      const tagsFn = tagsNodeMap[type];
      if (tagsFn) {
        return tagsFn(emberModel);
      }
    }
    return [];
  }, [data]);

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
