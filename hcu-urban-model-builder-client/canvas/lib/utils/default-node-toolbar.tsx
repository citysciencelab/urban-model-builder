import { NodeToolbar, Position, useReactFlow } from "@xyflow/react";
import { NodeType } from "hcu-urban-model-builder-backend";
import { EmberReactConnectorContext } from "../context/ember-react-connector";
import { memo, useContext } from "react";

export const DefaultNodeToolbar = memo(
  (props: {
    nodeId: string;
    isNodeSelected: boolean;
    allowGhost?: boolean;
  }) => {
    const emberReactConnector = useContext(EmberReactConnectorContext);
    const rfInstance = useReactFlow();

    const createGhost = async () => {
      const node = rfInstance.getNode(props.nodeId);

      await emberReactConnector.create("node", {
        type: NodeType.Ghost,
        ghostParentId: props.nodeId,
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
      <NodeToolbar isVisible={props.isNodeSelected} position={Position.Top}>
        {props.allowGhost && <button onClick={createGhost}>👻</button>}
        {<button onClick={deleteNode}>❌</button>}
      </NodeToolbar>
    );
  },
);
