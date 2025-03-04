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
  [ReactFlowNodeType.OgcApiFeatures]: (emberModel: EmberModel) => {
    const url = emberModel.get("data.collectionId");
    if (!url) {
      return [];
    }

    const properties = emberModel.get("data.query.properties");
    if (!properties) {
      return [url];
    }

    return [url, ...properties];
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

        {tags && (
          <div className="react-flow__node-base__footer">
            {tags.map((tag) => (
              <div className="react-flow__node-base--tags" key={tag}>
                {tag}
              </div>
            ))}
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
