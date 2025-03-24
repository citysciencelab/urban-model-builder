import {
  useState,
  useCallback,
  useRef,
  useEffect,
  DragEvent,
  useContext,
} from "react";
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
  ConnectionLineType,
  EdgeChange,
  reconnectEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  NodeDimensionChange,
  OnConnectStartParams,
  FinalConnectionState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BaseNode } from "./lib/nodes/base-node.tsx";
import { FlowTransitionEdge } from "./lib/edges/flow-tranistion.tsx";
import { ArrowNode } from "./lib/nodes/arrow-node.tsx";
import { FolderNode } from "./lib/nodes/folder-node.tsx";
import { AgentNode } from "./lib/nodes/agent-node.tsx";

import {
  getNodePositionInsideParent,
  sortNodeModels,
  sortNodes,
} from "./lib/utils/grouping.ts";
import {
  reactFlowEdgeToEdgeType,
  ReactFlowEdgeType,
  ReactFlowNodeType,
} from "./lib/declarations.ts";
import {
  EmberReactConnectorContext,
  NodeActions,
} from "./lib/context/ember-react-connector.ts";
import { GhostNode } from "./lib/nodes/ghost-node.tsx";
import { EditableEdge } from "./lib/edges/editable.tsx";
import { useEmberEventListeners } from "./lib/utils/use-ember-event-listeners.ts";
import { NodeParamsMapProvider } from "./lib/context/node-params-map.tsx";

type FlowOptions = {
  disabled?: boolean;
};

const nodeTypes = {
  [ReactFlowNodeType.Stock]: BaseNode,
  [ReactFlowNodeType.Variable]: BaseNode,
  [ReactFlowNodeType.State]: BaseNode,
  [ReactFlowNodeType.Flow]: ArrowNode,
  [ReactFlowNodeType.Converter]: BaseNode,
  [ReactFlowNodeType.Transition]: ArrowNode,
  [ReactFlowNodeType.Folder]: FolderNode,
  [ReactFlowNodeType.Agent]: AgentNode,
  [ReactFlowNodeType.Population]: BaseNode,
  [ReactFlowNodeType.Action]: BaseNode,
  [ReactFlowNodeType.Ghost]: GhostNode,
  [ReactFlowNodeType.OgcApiFeatures]: BaseNode,
} as const;

const edgesTypes = {
  [ReactFlowEdgeType.Link]: EditableEdge,
  [ReactFlowEdgeType.Flow]: FlowTransitionEdge,
  [ReactFlowEdgeType.Transition]: FlowTransitionEdge,
  [ReactFlowEdgeType.AgentPopulation]: EditableEdge,
};

function Flow({
  nodes: initialNodes,
  edges: initialEdges,
  flowOptions,
}: AppProps) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const nodeActions = useContext(EmberReactConnectorContext);
  useEmberEventListeners();

  const [nodes, setNodes] = useState(() =>
    [...initialNodes]?.sort(sortNodeModels).map((n) => ({ ...n.raw })),
  );

  const [edges, setEdges] = useState(() =>
    initialEdges.map((e) => {
      return {
        ...e.raw,
      };
    }),
  );

  const [connectionLineType, setConnectionLineType] = useState(
    ConnectionLineType.Bezier,
  );

  const sidebarContainerRef = useRef(null);
  const toolbarContainerRef = useRef(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "select") {
          if (change.selected) {
            nodeActions.pushSelection("node", change.id);
          } else {
            nodeActions.removeSelection("node", change.id);
          }
        }
        if (change.type === "position" && !change.dragging) {
          if (
            (
              changes.find(
                (c) => c.type === "dimensions" && c.id === change.id,
              ) as NodeDimensionChange
            )?.resizing
          ) {
            continue;
          }

          nodeActions.save("node", change.id, {
            position: change.position,
          });
        }
        if (change.type === "dimensions" && change.resizing === false) {
          const node = rfInstance.getNode(change.id);

          nodeActions.save("node", change.id, {
            height: node.height,
            width: node.width,
            position: node.position,
          });
        }
        if (change.type === "remove") {
          if (flowOptions.disabled) return;
          nodeActions.delete("node", change.id);
        }
      }
      setNodes((nds) => {
        return applyNodeChanges(changes, nds);
      });
    },
    [rfInstance],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === "remove") {
        if (flowOptions.disabled) return;
        nodeActions.delete("edge", change.id);
      }
    }

    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const getTmpEdgeId = (params: Connection) =>
    `tmp_source-${params.source}_target-${params.target}`;

  const getEdgeTypeByConnection = useCallback((connection: Connection) => {
    if (
      connection.sourceHandle.startsWith("flow-") ||
      connection.targetHandle.startsWith("flow-")
    ) {
      return ReactFlowEdgeType.Flow;
    }
    if (
      connection.targetHandle.startsWith("transition-") ||
      connection.sourceHandle.startsWith("transition-")
    ) {
      return ReactFlowEdgeType.Transition;
    }
    if (connection.sourceHandle.startsWith("agent-")) {
      return ReactFlowEdgeType.AgentPopulation;
    }

    return ReactFlowEdgeType.Link;
  }, []);

  const onConnect = useCallback(
    async (params: Connection) => {
      const tmpEdgeId = getTmpEdgeId(params);

      const type = getEdgeTypeByConnection(params);

      const tmpEdge: Edge = {
        type: type,
        id: tmpEdgeId,
        ...params,
      };

      setEdges((eds) => addEdge(tmpEdge, eds));

      const newEdge = await nodeActions.create("edge", {
        type: reactFlowEdgeToEdgeType(type),
        sourceId: params.source,
        targetId: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      });

      setEdges((eds) =>
        eds
          .filter((e) => e.id !== tmpEdgeId)
          .concat({
            ...newEdge.raw,
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

      await nodeActions.save("edge", oldEdge.id, {
        sourceId: newConnection.source,
        targetId: newConnection.target,
        sourceHandle: newConnection.sourceHandle,
        targetHandle: newConnection.targetHandle,
      });
    },
    [],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onBeforeDelete = useCallback(
    async (toBeDeleted: { nodes: Node[]; edges: Edge[] }) => {
      if (toBeDeleted.nodes.length > 0) {
        return nodeActions.confirmDeleteNodes(
          toBeDeleted.nodes.map((n) => n.id),
        );
      }
      return true;
    },
    [],
  );

  useEffect(() => {
    if (sidebarContainerRef.current) {
      nodeActions.onSidebarInserted(sidebarContainerRef.current);
    }
  }, [sidebarContainerRef.current]);

  useEffect(() => {
    if (toolbarContainerRef.current) {
      nodeActions.onToolbarInserted(toolbarContainerRef.current);
    }
  });

  const onNodeDrag = useCallback(
    (_e: any, node: Node) => {
      const intersections = rfInstance
        .getIntersectingNodes(node)
        .map((n) => n.id);

      setNodes((ns) =>
        ns.map((n) => ({
          ...n,
          className: intersections.includes(n.id) ? "intersect" : "",
        })),
      );
    },
    [rfInstance],
  );

  const onNodeDragStop = useCallback(
    async (_e: DragEvent<HTMLDivElement>, node: Node) => {
      const agentOrFolderNodes = rfInstance
        .getNodes()
        .filter(
          (n) =>
            n.type === ReactFlowNodeType.Agent ||
            n.type === ReactFlowNodeType.Folder,
        );
      const [intersection] = rfInstance.getIntersectingNodes(
        node,
        true,
        agentOrFolderNodes,
      );

      let nodeChangeData = null;
      if (intersection && intersection.id !== node.parentId) {
        const positionInParent = getNodePositionInsideParent(
          node,
          intersection,
        );

        nodeChangeData = {
          parentId: intersection.id,
          position: positionInParent,
        };
      } else if (!intersection && node.parentId) {
        const oldParent = rfInstance.getNode(node.parentId);
        const positionOnCanvas = {
          x: oldParent.position.x + node.position.x,
          y: oldParent.position.y + node.position.y,
        };

        nodeChangeData = {
          parentId: null,
          position: positionOnCanvas,
        };
      }

      if (nodeChangeData) {
        setNodes((ns) =>
          ns
            .map((n) => {
              if (n.id === node.id) {
                return { ...n, ...nodeChangeData };
              }
              return { ...n, className: "" };
            })
            .sort(sortNodes),
        );

        await nodeActions.save("node", node.id, nodeChangeData);
      } else {
        setNodes((ns) => ns.map((n) => ({ ...n, className: "" })));
      }
    },
    [rfInstance],
  );

  const [connectingHandle, setConnectingHandle] =
    useState<OnConnectStartParams | null>(null);

  const onConnectionStart = (
    _: MouseEvent | TouchEvent,
    params: OnConnectStartParams,
  ) => {
    setConnectingHandle(params);

    if (
      params.handleId.startsWith("flow-") ||
      params.handleId.startsWith("transition-")
    ) {
      setConnectionLineType(ConnectionLineType.SmoothStep);
    } else {
      setConnectionLineType(ConnectionLineType.Bezier);
    }
  };

  const onConnectionEnd = () => {
    setConnectingHandle(null);
  };

  const getOriginNodeId = (node: Node) => {
    return node.type !== ReactFlowNodeType.Ghost
      ? node.id
      : node.data.emberModel.get("ghostParent.id");
  };

  const getOriginNodeType = (node: Node) => {
    if (node.type !== ReactFlowNodeType.Ghost) {
      return node.type;
    }

    const ghostParentId = node.data.emberModel.get("ghostParent.id");

    return rfInstance.getNode(ghostParentId).type;
  };

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) {
        return false;
      }

      const sourceNode = rfInstance.getNode(connection.source);
      const targetNode = rfInstance.getNode(connection.target);

      const sourceId = getOriginNodeId(sourceNode);
      const targetId = getOriginNodeId(targetNode);
      if (sourceId === targetId) {
        return false;
      }

      const sourceType = getOriginNodeType(sourceNode);
      const targetType = getOriginNodeType(targetNode);
      if (connection.sourceHandle.startsWith("flow-")) {
        return targetType === ReactFlowNodeType.Stock;
      }
      if (connection.targetHandle.startsWith("flow-")) {
        return sourceType === ReactFlowNodeType.Stock;
      }

      if (connection.sourceHandle.startsWith("transition-")) {
        return targetType === ReactFlowNodeType.State;
      }
      if (connection.targetHandle.startsWith("transition-")) {
        return sourceType === ReactFlowNodeType.State;
      }

      if (connection.sourceHandle.startsWith("agent-")) {
        return targetType === ReactFlowNodeType.Population;
      }
      if (connection.targetHandle.startsWith("agent-")) {
        return sourceType === ReactFlowNodeType.Agent;
      }

      return true;
    },
    [rfInstance],
  );

  return (
    <ReactFlow
      onInit={setRfInstance}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={edges}
      onEdgesChange={onEdgesChange}
      onConnectStart={onConnectionStart}
      onConnectEnd={onConnectionEnd}
      onConnect={onConnect}
      onReconnect={onReconnect}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onDragOver={onDragOver}
      onBeforeDelete={onBeforeDelete}
      isValidConnection={isValidConnection}
      nodeTypes={nodeTypes}
      edgeTypes={edgesTypes}
      connectionLineType={connectionLineType}
      edgesFocusable={!flowOptions.disabled}
      nodesDraggable={!flowOptions.disabled}
      nodesConnectable={!flowOptions.disabled}
      nodesFocusable={!flowOptions.disabled}
      deleteKeyCode={["Backspace", "Delete"]}
      panOnDrag={true}
      fitView
      className={
        connectingHandle ? `connecting-from-${connectingHandle.handleType}` : ""
      }
    >
      <Panel position="bottom-center">
        <div className="toolbar__container" ref={toolbarContainerRef}></div>
      </Panel>
      <Background />
      <Controls />
      <div
        className="sidebar__container sidebar__container--right"
        id="sidebar-container"
        ref={sidebarContainerRef}
      ></div>
    </ReactFlow>
  );
}

interface AppProps {
  nodes: any[];
  edges: any[];
  flowOptions: FlowOptions;
}

function App({ nodes, edges, flowOptions }: AppProps) {
  return (
    <ReactFlowProvider>
      <NodeParamsMapProvider>
        <Flow nodes={nodes} edges={edges} flowOptions={flowOptions} />
      </NodeParamsMapProvider>
    </ReactFlowProvider>
  );
}

export function createReact(
  container: HTMLElement,
  nodes: any[],
  edges: any[],
  nodeActions: NodeActions,
  flowOptions: FlowOptions,
) {
  const root = createRoot(container);
  root.render(
    <EmberReactConnectorContext.Provider value={nodeActions}>
      <App nodes={nodes} edges={edges} flowOptions={flowOptions} />
    </EmberReactConnectorContext.Provider>,
  );

  return root;
}
