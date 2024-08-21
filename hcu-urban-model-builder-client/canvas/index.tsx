import { useState, useCallback, memo } from "react";
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
  NodeProps,
  Position,
  Handle,
  MarkerType,
  SmoothStepEdge,
  ConnectionLineType,
  HandleType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
// import { BaseNode } from "./lib/base-node";

type NodeActions = {
  create: (data: any) => Promise<any>;
  save: (id: string, data: any) => void;
  delete: (id: string) => Promise<void>;
};

export const BaseNode = memo(({ data, isConnectable }: NodeProps) => {
  const positions = [
    Position.Top,
    Position.Bottom,
    Position.Left,
    Position.Right,
  ];

  return (
    <div className="react-flow__node-default">
      {positions.map((position, index) => (
        <Handle
          id={`target-${position}`}
          key={position}
          type="target"
          position={position}
        />
      ))}
      {positions.map((position, index) => (
        <Handle
          id={`source-${position}`}
          key={position}
          type="source"
          position={position}
        />
      ))}

      {["target", "source"].map((type: HandleType) =>
        positions.map((position) => (
          <Handle
            id={`${type}-${position}`}
            key={`${type}-${position}`}
            type={type}
            position={position}
          />
        )),
      )}

      {data.label as string}
    </div>
  );
});

const nodeTypes = {
  base: BaseNode,
};

const edgesTypes = {
  default: SmoothStepEdge,
};

function Flow({
  nodes: initialNodes,
  nodeActions,
}: {
  nodes: any[];
  nodeActions: NodeActions;
}) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes] = useState(() => initialNodes.map((n) => n.rawNode));
  const [edges, setEdges] = useState([]);

  console.log("nodes", initialNodes);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      console.log("change", change);

      if (change.type === "position" && !change.dragging) {
        nodeActions.save(change.id, { position: change.position });
      }
      if (change.type === "remove") {
        nodeActions.delete(change.id);
      }
    }
    setNodes((nds) => {
      return applyNodeChanges(changes, nds);
    });
  }, []);

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback(
    (params: any) => {
      console.log("onConnect", params);

      params.markerEnd = {
        type: MarkerType.Arrow,
      };

      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges],
  );

  const addNode = useCallback(async () => {
    console.log("addNode", rfInstance);
    const result = await nodeActions.create({
      data: { label: `Node ${nodes.length}` },
      position: {
        x: 0,
        y: 0,
      },
    });
    setNodes((nds) => nds.concat(result.rawNode));
  }, [nodes]);

  return (
    <ReactFlow
      onInit={setRfInstance}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
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

function App({
  nodes,
  nodeActions,
}: {
  nodes: any[];
  nodeActions: NodeActions;
}) {
  return <Flow nodes={nodes} nodeActions={nodeActions} />;
}

export function initReact(
  root: HTMLElement,
  nodes: any[],
  nodeActions: NodeActions,
) {
  createRoot(root).render(<App nodes={nodes} nodeActions={nodeActions} />);
}
