import { ReactFlowInstance } from '@xyflow/react';
import { createContext } from 'react';

export type NodeActions = {
  create: (type: 'edge' | 'node', data: any) => Promise<any>;
  save: (type: 'edge' | 'node', id: string, data: any) => Promise<any>;
  delete: (type: 'edge' | 'node', id: string) => Promise<void>;
  select: (type: 'edge' | 'node', id: string) => void;
  unselect: (type: 'edge' | 'node', id: string) => void;
  onSidebarInserted: (element: HTMLElement) => void;
  onToolbarInserted: (element: HTMLElement) => void;
  setRfInstance: (instance: ReactFlowInstance) => void;
  draggedNodeConfig: any;
  storeEventEmitter: {
    on: (
      dataModelName: string,
      event: 'created' | 'updated' | 'deleted',
      callback: (data: any) => void,
    ) => void;
    off: (
      dataModelName: string,
      event: 'created' | 'updated' | 'deleted',
      callback: (data: any) => void,
    ) => void;
  };
};

export const EmberReactConnectorContext = createContext<NodeActions>(null);
