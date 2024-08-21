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
import { BaseNode } from "./lib/base-node.tsx";

type NodeActions = {
  create: (type: "edge" | "node", data: any) => Promise<any>;
  save: (type: "edge" | "node", id: string, data: any) => void;
  delete: (type: "edge" | "node", id: string) => Promise<void>;
};

const nodeTypes = {
  base: BaseNode,
};

const edgesTypes = {
  default: SmoothStepEdge,
};

function Flow({
  nodes: initialNodes,
  edges: initialEdges,
  nodeActions,
}: AppProps) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes] = useState(() => initialNodes.map((n) => n.raw));
  const [edges, setEdges] = useState(() =>
    initialEdges.map((e) => ({
      ...e.raw,
      markerEnd: { type: MarkerType.Arrow },
    })),
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      console.log("change", change);

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

  const getTmpEdgeId = (params: Connection) =>
    `tmp_source-${params.source}_target-${params.target}`;

  const onConnect = useCallback(
    async (params: Connection) => {
      console.log("onConnect", params);

      const tmpEdgeId = getTmpEdgeId(params);
      const markerEnd = { type: MarkerType.Arrow };
      const tmpEdge: Edge = {
        id: tmpEdgeId,
        markerEnd,
        ...params,
      };

      setEdges((eds) => addEdge(tmpEdge, eds));

      const newEdge = await nodeActions.create("edge", {
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      });

      console.log("newEdge", newEdge);
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

  const addNode = useCallback(async () => {
    console.log("addNode", rfInstance);
    const result = await nodeActions.create("node", {
      data: { label: `Node ${nodes.length}` },
      position: {
        x: 0,
        y: 0,
      },
    });
    setNodes((nds) => nds.concat(result.raw));
  }, [nodes]);

  return (
    <ReactFlow
      onInit={setRfInstance}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onReconnect={onReconnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgesTypes}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
    >
      <Panel position="top-right">
        <button onClick={addNode}>Add Node</button>
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
