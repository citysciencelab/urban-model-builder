import { useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  Panel,
  addEdge,
  ReactFlowInstance,
  MarkerType,
  SmoothStepEdge,
  ConnectionLineType,
  EdgeChange,
  reconnectEdge,
  Connection,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BaseNode } from "./lib/nodes/base-node.tsx";
import { EdgeType, NodeType } from "hcu-urban-model-builder-backend";
import { FlowEdge } from "./lib/edges/flow.tsx";
import { FlowNode } from "./lib/nodes/flow-node.tsx";

type NodeActions = {
  create: (type: "edge" | "node", data: any) => Promise<any>;
  save: (type: "edge" | "node", id: string, data: any) => void;
  delete: (type: "edge" | "node", id: string) => Promise<void>;
  select: (type: "edge" | "node", id: string) => void;
  unselect: (type: "edge" | "node", id: string) => void;
};

const getNodeTypeStringName = (type: NodeType) => NodeType[type].toLowerCase();
const getEdgeTypeStringName = (type: EdgeType) => EdgeType[type].toLowerCase();

const nodeTypes = {
  [getNodeTypeStringName(NodeType.Stock)]: BaseNode,
  [getNodeTypeStringName(NodeType.Variable)]: BaseNode,
  [getNodeTypeStringName(NodeType.Flow)]: FlowNode,
};

const edgesTypes = {
  [getEdgeTypeStringName(EdgeType.Link)]: SmoothStepEdge,
  [getEdgeTypeStringName(EdgeType.Flow)]: FlowEdge,
};

console.log(edgesTypes);

function Flow({
  nodes: initialNodes,
  edges: initialEdges,
  nodeActions,
}: AppProps) {
  console.log(initialEdges);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes] = useState(() => initialNodes.map((n) => n.raw));
  const [edges, setEdges] = useState(() =>
    initialEdges.map((e) => {
      return {
        ...e.raw,
        markerEnd: { type: MarkerType.Arrow },
        // type: "flow",
      };
    }),
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === "select") {
        console.log(change);
        if (change.selected) {
          nodeActions.select("node", change.id);
        } else {
          nodeActions.unselect("node", change.id);
        }
      }
      if (change.type === "position" && !change.dragging) {
        nodeActions.save("node", change.id, { position: change.position });
      }
      if (change.type === "remove") {
        nodeActions.delete("node", change.id);
      }
    }
    setNodes((nds) => {
      return applyNodeChanges(changes, nds);
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === "remove") {
        nodeActions.delete("edge", change.id);
      }
    }

    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // TODO: Validate connection
  const isValidConnection = useCallback(
    (connection: Connection) => true, // connection.source !== connection.target,
    [],
  );

  const getTmpEdgeId = (params: Connection) =>
    `tmp_source-${params.source}_target-${params.target}`;

  const onConnect = useCallback(
    async (params: Connection) => {
      const tmpEdgeId = getTmpEdgeId(params);
      const markerEnd = { type: MarkerType.Arrow };

      console.log("sourceHandle", params, params.targetHandle);

      const type =
        params.sourceHandle.startsWith("flow-") ||
        params.targetHandle.startsWith("flow-")
          ? EdgeType.Flow
          : EdgeType.Link;

      const tmpEdge: Edge = {
        type: getEdgeTypeStringName(type),
        id: tmpEdgeId,
        markerEnd,
        ...params,
      };

      setEdges((eds) => addEdge(tmpEdge, eds));

      const newEdge = await nodeActions.create("edge", {
        type: type,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      });

      setEdges((eds) =>
        eds
          .filter((e) => e.id !== tmpEdgeId)
          .concat({
            ...newEdge.raw,
            markerEnd,
          }),
      );
    },
    [setEdges],
  );

  const onReconnect = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) =>
        reconnectEdge(oldEdge, newConnection, els, { shouldReplaceId: false }),
      );

      nodeActions.save("edge", oldEdge.id, {
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle,
        targetHandle: newConnection.targetHandle,
      });
    },
    [],
  );

  const addNode = useCallback(
    async (type: NodeType) => {
      const result = await nodeActions.create("node", {
        type: type,
        data: { label: `${NodeType[type]} ${nodes.length}` },
        position: {
          x: 0,
          y: 0,
        },
      });
      setNodes((nds) => nds.concat(result.raw));
    },
    [nodes],
  );

  return (
    <ReactFlow
      onInit={setRfInstance}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onReconnect={onReconnect}
      isValidConnection={isValidConnection}
      nodeTypes={nodeTypes}
      edgeTypes={edgesTypes}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
    >
      <Panel position="top-right">
        <button onClick={() => addNode(NodeType.Stock)}>Add Stock</button>
        <button onClick={() => addNode(NodeType.Variable)}>Add Var</button>
        <button onClick={() => addNode(NodeType.Flow)}>Add Flow</button>
        <div id="some-wormhole"></div>
      </Panel>
      <Background />
      <Controls />
    </ReactFlow>
  );
}

interface AppProps {
  nodes: any[];
  edges: any[];
  nodeActions: NodeActions;
}

function App({ nodes, nodeActions, edges }: AppProps) {
  return <Flow nodes={nodes} edges={edges} nodeActions={nodeActions} />;
}

export function initReact(
  root: HTMLElement,
  nodes: any[],
  edges: any[],
  nodeActions: NodeActions,
) {
  createRoot(root).render(
    <App nodes={nodes} edges={edges} nodeActions={nodeActions} />,
  );
}
