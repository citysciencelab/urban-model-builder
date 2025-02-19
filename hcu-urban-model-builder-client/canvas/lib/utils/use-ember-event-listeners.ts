import { MarkerType, Node, useReactFlow } from '@xyflow/react';
import {
  EmberReactConnectorContext,
  StoreEventSenderTransport,
} from '../context/ember-react-connector';
import { useCallback, useContext, useEffect } from 'react';
import { NodeType } from 'hcu-urban-model-builder-backend';

const nodeHasChanged = (node1: Node, node2: any) => {
  return (
    node1.position.x !== node2.position.x ||
    node1.position.y !== node2.position.y ||
    node1.width !== node2.width ||
    node1.height !== node2.height
  );
};

export const useEmberEventListeners = () => {
  const emberReactConnector = useContext(EmberReactConnectorContext);
  const rfInstance = useReactFlow();
  const { setNodes, setEdges } = rfInstance;

  const createNode = useCallback(
    async (nodeConfig: { type: NodeType }) => {
      const type = nodeConfig.type;
      await emberReactConnector.create('node', {
        type: type,
        name: `${NodeType[type]} ${rfInstance.getNodes().length + 1}`,
        data: {},
        position: rfInstance!.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        }),
      });
    },
    [rfInstance],
  );

  const addNode = useCallback(
    async (newNode: any) => {
      if (
        newNode.modelsVersions.id !== emberReactConnector.currentModelVersionId
      ) {
        return;
      }

      setNodes((nds) =>
        nds.concat({
          ...newNode.raw,
        }),
      );
    },
    [rfInstance, emberReactConnector],
  );

  const updateNode = useCallback(
    (updatedNode: any, sender: StoreEventSenderTransport) => {
      if (
        sender === StoreEventSenderTransport.LOCAL ||
        updatedNode.modelsVersions.id !==
          emberReactConnector.currentModelVersionId
      ) {
        return;
      }

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === updatedNode.id && nodeHasChanged(n, updatedNode.raw)) {
            return {
              ...n,
              ...updatedNode.raw,
            };
          }

          return n;
        }),
      );
    },
    [],
  );

  const removeNode = useCallback(
    (deletedNode: { id: string }) => {
      setNodes((nds) => nds.filter((n) => n.id !== deletedNode.id));
    },
    [rfInstance],
  );

  const selectNode = useCallback(
    (selectNodeId: string) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === selectNodeId,
        })),
      );
    },
    [rfInstance],
  );

  const addEdge = useCallback(
    (newEdge: any, sender: StoreEventSenderTransport) => {
      if (
        sender === StoreEventSenderTransport.LOCAL ||
        newEdge.modelsVersions.id !== emberReactConnector.currentModelVersionId
      ) {
        return;
      }

      setEdges((eds) =>
        eds.concat({
          ...newEdge.raw,
          markerEnd: { type: MarkerType.Arrow },
        }),
      );
    },
    [],
  );

  const updateEdge = useCallback(
    (updateEdge: any, sender: StoreEventSenderTransport) => {
      if (
        sender === StoreEventSenderTransport.LOCAL ||
        updateEdge.modelsVersions.id !==
          emberReactConnector.currentModelVersionId
      ) {
        return;
      }

      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === updateEdge.id) {
            return {
              ...e,
              ...updateEdge.raw,
            };
          }

          return e;
        }),
      );
    },
    [],
  );

  const removeEdge = useCallback((deletedEdge: { id: string }) => {
    setEdges((eds) => eds.filter((e) => e.id !== deletedEdge.id));
  }, []);

  useEffect(() => {
    emberReactConnector.storeEventEmitter.on('node', 'created', addNode);
    emberReactConnector.storeEventEmitter.on('node', 'updated', updateNode);
    emberReactConnector.storeEventEmitter.on('node', 'deleted', removeNode);
    emberReactConnector.eventBus.on('node:selected', selectNode);
    emberReactConnector.eventBus.on(
      'primitive-modal:create-clicked',
      createNode,
    );

    emberReactConnector.storeEventEmitter.on('edge', 'created', addEdge);
    emberReactConnector.storeEventEmitter.on('edge', 'updated', updateEdge);
    emberReactConnector.storeEventEmitter.on('edge', 'deleted', removeEdge);

    return () => {
      emberReactConnector.storeEventEmitter.off('node', 'created', addNode);
      emberReactConnector.storeEventEmitter.off('node', 'updated', updateNode);
      emberReactConnector.storeEventEmitter.off('node', 'deleted', removeNode);
      emberReactConnector.eventBus.off('node:selected', selectNode);
      emberReactConnector.eventBus.off(
        'primitive-modal:create-clicked',
        createNode,
      );

      emberReactConnector.storeEventEmitter.off('edge', 'created', addEdge);
      emberReactConnector.storeEventEmitter.off('edge', 'updated', updateEdge);
      emberReactConnector.storeEventEmitter.off('edge', 'deleted', removeEdge);
    };
  }, [addNode, removeNode]);
};
