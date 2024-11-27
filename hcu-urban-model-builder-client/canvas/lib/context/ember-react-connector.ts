import { createContext } from 'react';

export type NodeActions = {
  create: (type: 'edge' | 'node', data: any) => Promise<any>;
  save: (type: 'edge' | 'node', id: string, data: any) => Promise<any>;
  delete: (type: 'edge' | 'node', id: string) => Promise<void>;
  pushSelection: (type: 'edge' | 'node', id: string) => void;
  removeSelection: (type: 'edge' | 'node', id: string) => void;
  onSidebarInserted: (element: HTMLElement) => void;
  onToolbarInserted: (element: HTMLElement) => void;
  draggedNodeConfig: any;
  storeEventEmitter: {
    on: (
      dataModelName:
        | 'node'
        | 'edge'
        | 'model'
        | 'user'
        | 'models-version'
        | 'models-user'
        | 'scenario'
        | 'scenarios-value',
      event: 'created' | 'updated' | 'deleted',
      callback: (data: any) => void,
    ) => void;
    off: (
      dataModelName:
        | 'node'
        | 'edge'
        | 'model'
        | 'user'
        | 'models-version'
        | 'models-user'
        | 'scenario'
        | 'scenarios-value',
      event: 'created' | 'updated' | 'deleted',
      callback: (data: any) => void,
    ) => void;
  };
  eventBus: {
    on: (
      eventName: 'node:selected' | 'node:unselected',
      callback: (...args: any[]) => void,
    ) => void;
    off: (
      eventName: 'node:selected' | 'node:unselected',
      callback: (...args: any[]) => void,
    ) => void;
    emit: (
      eventName: 'node:selected' | 'node:unselected',
      ...data: any[]
    ) => void;
  };
};

export const EmberReactConnectorContext = createContext<NodeActions>(null);
