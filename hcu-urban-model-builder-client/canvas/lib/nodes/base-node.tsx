import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo, useMemo } from "react";
import { DefaultNodeHandles } from "../utils/default-node-handles.tsx";
import { DefaultNodeToolbar } from "../utils/default-node-toolbar.tsx";
import { ReactFlowNodeType } from "../declarations.ts";
import { Icon, IconNames } from "../utils/icon.tsx";

interface EmberModel {
  get(key: string): any;
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
    if (!properties) {
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

export const BaseNode = memo(
  ({ id, data, isConnectable, selected, type }: NodeProps) => {
    const emberModel = data.emberModel as EmberModel | undefined;

    const tags = useMemo(() => {
      if (emberModel) {
        const tagsFn = tagsNodeMap[type];
        if (tagsFn) {
          return tagsFn(emberModel);
        }
      }
      return [];
    }, [data]);

    const handleType =
      type === ReactFlowNodeType.OgcApiFeatures ? "source" : undefined;

    return (
      <div className="react-flow__node-base__content">
        <DefaultNodeHandles type={handleType} isConnectable={isConnectable} />
        <NodeResizer isVisible={!!selected} />
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
        <DefaultNodeToolbar
          nodeId={id}
          isNodeSelected={selected}
          allowGhost={true}
        />
      </div>
    );
  },
);
