import { MarkerType, useReactFlow } from '@xyflow/react';
import {
  EmberReactConnectorContext,
  StoreEventSenderTransport,
} from '../context/ember-react-connector';
import { useCallback, useContext, useEffect } from 'react';
import { NodeType } from 'hcu-urban-model-builder-backend';
import {
  applyContainerEdgeVisibility,
  applyContainerVisibility,
} from './container-visibility';

export const useEmberEventListeners = () => {
  const emberReactConnector = useContext(EmberReactConnectorContext);
  const rfInstance = useReactFlow();
  const { setNodes, setEdges } = rfInstance;

  const createNode = useCallback(
    async (nodeConfig: { type: NodeType }) => {
      const type = nodeConfig.type;

      let sizeOptions = {};
      if (type === NodeType.Agent || type === NodeType.Folder) {
        sizeOptions = {
          width: 216,
          height: 108,
        };
      }

      const nodeData = {
        type: type,
        name: `${NodeType[type]} ${rfInstance.getNodes().length + 1}`,
        // Type-specific defaults (e.g. Variable's value: '0') are applied
        // server-side by nodeDataResolver, so an empty payload is enough here.
        data: {},
        position: rfInstance!.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        }),
        ...sizeOptions,
      };

      await emberReactConnector.create('node', nodeData);
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
      if (newNode.data?.isSubModelInternal) return;

      setNodes((nds) => {
        const visibleNodes = applyContainerVisibility(
          nds.concat({
            ...newNode.raw,
          }),
        );
        setEdges((edges) => applyContainerEdgeVisibility(edges, visibleNodes));
        return visibleNodes;
      });
    },
    [rfInstance, emberReactConnector],
  );

  const updateNode = useCallback(
    (updatedNode: any, sender: StoreEventSenderTransport) => {
      if (
        updatedNode.modelsVersions.id !==
        emberReactConnector.currentModelVersionId
      ) {
        return;
      }

      setNodes((nds) => {
        const updatedNodes = nds.map((n) => {
          if (n.id === updatedNode.id) {
            return sender === StoreEventSenderTransport.LOCAL
              ? {
                  ...n,
                  data: updatedNode.raw.data,
                }
              : {
                  ...n,
                  ...updatedNode.raw,
                };
          }
          if (n.data.emberModel?.get('ghostParent.id') === updatedNode.id) {
            return {
              ...n,
              data: {
                ...n.data,
              },
            };
          }

          return n;
        });
        const visibleNodes = applyContainerVisibility(updatedNodes);
        setEdges((edges) => applyContainerEdgeVisibility(edges, visibleNodes));
        return visibleNodes;
      });
    },
    [],
  );

  const removeNode = useCallback(
    (deletedNode: { id: string }) => {
      setNodes((nds) => {
        const visibleNodes = applyContainerVisibility(
          nds.filter((n) => n.id !== deletedNode.id),
        );
        setEdges((edges) => applyContainerEdgeVisibility(edges, visibleNodes));
        return visibleNodes;
      });
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
        newEdge.modelsVersions?.id &&
        newEdge.modelsVersions.id !== emberReactConnector.currentModelVersionId
      ) {
        return;
      }
      const rawEdge = newEdge.raw;
      const nodes = emberReactConnector.peekAll('node');
      const source = nodes.find((node: any) => node.id === rawEdge.source);
      const target = nodes.find((node: any) => node.id === rawEdge.target);
      if (source?.data?.isSubModelInternal || target?.data?.isSubModelInternal)
        return;

      setEdges((eds) =>
        eds.some((edge) => edge.id === newEdge.id) ||
        // A hand-drawn connection is inserted optimistically with a temporary
        // id and replaced by onConnect after persistence. Formula sync and
        // sub-model import do not create that temporary edge, so their local
        // create events must be added here to become visible immediately.
        (sender === StoreEventSenderTransport.LOCAL &&
          eds.some(
            (edge) =>
              edge.id.startsWith('tmp_source-') &&
              edge.source === rawEdge.source &&
              edge.target === rawEdge.target &&
              edge.sourceHandle === rawEdge.sourceHandle &&
              edge.targetHandle === rawEdge.targetHandle,
          ))
          ? eds
          : applyContainerEdgeVisibility(
              eds.concat({
                ...rawEdge,
                markerEnd: { type: MarkerType.Arrow },
              }),
              rfInstance.getNodes(),
            ),
      );
    },
    [emberReactConnector, rfInstance, setEdges],
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
        applyContainerEdgeVisibility(
          eds.map((e) => {
            if (e.id === updateEdge.id) {
              return {
                ...e,
                ...updateEdge.raw,
              };
            }

            return e;
          }),
          rfInstance.getNodes(),
        ),
      );
    },
    [emberReactConnector, rfInstance],
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
  }, [
    addNode,
    updateNode,
    removeNode,
    selectNode,
    createNode,
    addEdge,
    updateEdge,
    removeEdge,
    emberReactConnector,
  ]);
};
