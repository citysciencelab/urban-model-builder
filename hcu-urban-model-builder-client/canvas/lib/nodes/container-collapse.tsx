import { Handle, Position, useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import { useContext, useState } from "react";
import type { MouseEvent } from "react";
import { EmberReactConnectorContext } from "../context/ember-react-connector.ts";
import { Icon } from "../utils/icon.tsx";
import type { IconNames } from "../utils/icon.tsx";
import {
  applyContainerEdgeVisibility,
  applyContainerVisibility,
} from "../utils/container-visibility.ts";

const typeLabels: Record<string, string> = {
  folder: "Folder",
  agent: "Agent",
  "sub-model": "Sub-model",
};

type ContainerCollapseProps = {
  id: string;
  type: string;
  data: any;
  /** Read-only canvases (e.g. shared, view-only) must not offer this toggle. */
  disabled?: boolean;
};

export function ContainerCollapse({
  id,
  type,
  data,
  disabled,
}: ContainerCollapseProps) {
  const nodeActions = useContext(EmberReactConnectorContext);
  const { setNodes, setEdges } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const modelData = data.emberModel?.get("data") || {};
  const collapsed = Boolean(modelData.collapsed);
  const name = data.emberModel?.get("name");

  const updateVisibility = (nextCollapsed: boolean) => {
    setNodes((currentNodes) => {
      const overrides = new Map([[id, nextCollapsed]]);
      const nextNodes = applyContainerVisibility(
        currentNodes as Node[],
        overrides,
      );
      setEdges((currentEdges) =>
        applyContainerEdgeVisibility(currentEdges, nextNodes),
      );
      return nextNodes;
    });
  };

  const toggleCollapsed = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (saving || disabled) return;

    const nextCollapsed = !collapsed;
    setSaving(true);
    updateVisibility(nextCollapsed);

    try {
      await nodeActions.save("node", id, {
        data: { ...modelData, collapsed: nextCollapsed },
      });
    } catch (error) {
      updateVisibility(collapsed);
      console.error("Could not save collapsed container state", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="react-flow__node-container-collapse nodrag nopan"
        onClick={toggleCollapsed}
        disabled={saving || disabled}
        title={collapsed ? "Ausklappen" : "Einklappen"}
        aria-label={collapsed ? "Ausklappen" : "Einklappen"}
      >
        {collapsed ? (
          <span
            className="react-flow__node-container-window-icon"
            aria-hidden="true"
          />
        ) : (
          <span
            className="react-flow__node-container-minus-icon"
            aria-hidden="true"
          >
            −
          </span>
        )}
      </button>
      {/* These two handles exist whenever the node is collapsed, whether or
          not this specific button is disabled, so that read-only viewers
          still see edges projected onto (rather than lost behind) the
          collapsed container. */}
      {collapsed && (
        <>
          <Handle
            id="collapsed-target"
            type="target"
            position={Position.Top}
            className="react-flow__node-container-center-handle"
            isConnectable={false}
          />
          <Handle
            id="collapsed-source"
            type="source"
            position={Position.Top}
            className="react-flow__node-container-center-handle"
            isConnectable={false}
          />
          <div className="react-flow__node-container-identity">
            <div className="react-flow__node-container-identity-icon">
              <Icon icon={type as IconNames} />
            </div>
            <div className="react-flow__node-container-identity-type">
              {typeLabels[type] || type}
            </div>
            <div className="react-flow__node-container-identity-name">
              {name}
            </div>
          </div>
        </>
      )}
    </>
  );
}
