import type Store from '@ember-data/store';
import { action } from '@ember/object';
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type Edge from 'hcu-urban-model-builder-client/models/edge';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type StoreEventEmitterService from './store-event-emitter';
import type { ReactFlowInstance } from '@xyflow/react';
import type { NodeType } from 'hcu-urban-model-builder-backend';

export default class EmberReactConnectorService extends Service {
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;

  @tracked selected: (Node | Edge)[] = [];
  @tracked currentModel: ModelModel | null = null;
  @tracked sidebarElement: HTMLElement | null = null;
  @tracked toolbarElement: HTMLElement | null = null;
  @tracked rfInstance: ReactFlowInstance | null = null;
  @tracked draggedNodeConfig: {
    label: string;
    className: string;
    value: NodeType;
  } | null = null;

  @action
  async save(type: 'node' | 'edge', id: string, rawData: any) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }

    const data = { ...rawData };
    for (const key of ['source', 'target']) {
      if (key in rawData) {
        data[key] = this.store.peekRecord<Node>('node', rawData[key]);
      }
    }
    Object.assign(record, data);
    await record.save();
  }

  @action
  async create(type: 'node' | 'edge', rawData: any) {
    const data = { ...rawData };
    for (const key of ['source', 'target']) {
      if (key in rawData) {
        data[key] = this.store.peekRecord<Node>('node', rawData[key]);
      }
    }

    data.model = this.currentModel;

    return this.store.createRecord<Node | Edge>(type, data).save();
  }

  @action
  async delete(type: 'node' | 'edge', id: string) {
    this.selected = this.selected.filter((r) => r.id !== id);
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    record.deleteRecord();
    await record.save();
  }

  @action
  select(type: 'node' | 'edge', id: string) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    this.selected = [...this.selected, record];
  }

  @action
  unselect(type: 'node' | 'edge', id: string) {
    this.selected = this.selected.filter((r) => r.id !== id);
  }

  @action
  onSidebarInserted(element: HTMLElement) {
    this.sidebarElement = element;
  }

  @action
  onToolbarInserted(element: HTMLElement) {
    this.toolbarElement = element;
  }

  @action
  setRfInstance(rfInstance: ReactFlowInstance) {
    this.rfInstance = rfInstance;
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:ember-react-connector')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('ember-react-connector') declare altName: EmberReactConnectorService;`.
declare module '@ember/service' {
  interface Registry {
    'ember-react-connector': EmberReactConnectorService;
  }
}
