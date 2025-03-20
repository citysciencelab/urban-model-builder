import { NodeToolbar, Position, useReactFlow } from "@xyflow/react";
import { NodeType } from "hcu-urban-model-builder-backend";
import { EmberReactConnectorContext } from "../context/ember-react-connector";
import { memo, useContext } from "react";
import { Icon } from "./icon.tsx";

export const DefaultNodeToolbar = memo(
  (props: {
    nodeId: string;
    isNodeSelected: boolean;
    allowGhost?: boolean;
    offset?: number;
    position?: Position;
    children?: React.ReactNode;
  }) => {
    const emberReactConnector = useContext(EmberReactConnectorContext);
    const rfInstance = useReactFlow();

    const createGhost = async () => {
      const node = rfInstance.getNode(props.nodeId);

      await emberReactConnector.create("node", {
        type: NodeType.Ghost,
        ghostParentId: props.nodeId,
        parentId: node.parentId ?? null,
        position: {
          x: node.position.x + 10,
          y: node.position.y + 10,
        },
        data: {},
      });
    };

    const deleteNode = async () => {
      if (emberReactConnector.confirmDeleteNodes([props.nodeId])) {
        await emberReactConnector.delete("node", props.nodeId);
      }
    };

    return (
      <NodeToolbar
        isVisible={props.isNodeSelected}
        position={props.position || Position.Top}
        offset={props.offset || 8}
      >
        {props.children}
        {!emberReactConnector.applicationState.isDemoMode &&
          props.allowGhost && (
            <button
              onClick={createGhost}
              className="default-toolbar__ghost-button"
            >
              <span>👻</span>
            </button>
          )}
        <button onClick={deleteNode}>
          <Icon icon="close" />
        </button>
      </NodeToolbar>
    );
  },
);
