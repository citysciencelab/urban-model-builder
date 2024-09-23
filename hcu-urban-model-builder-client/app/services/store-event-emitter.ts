import { action } from '@ember/object';
import Service from '@ember/service';
import type { Type } from '@warp-drive/core-types/symbols';
import type User from 'hcu-urban-model-builder-client/models/user';
import type Edge from 'hcu-urban-model-builder-client/models/edge';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type Node from 'hcu-urban-model-builder-client/models/node';

type DataModels = Node | Edge | ModelModel | User;

export type DataModelsNames = DataModels[typeof Type];

export type DataModel<T extends DataModelsNames> = Extract<
  DataModels,
  { [Type]: T }
>;

type EventNames = 'created' | 'updated' | 'deleted';

type Listeners = {
  [K in DataModelsNames]: Map<EventNames, Set<(model: DataModels) => void>>;
};

export default class StoreEventEmitterService extends Service {
  listeners: Listeners = {
    node: new Map(),
    edge: new Map(),
    model: new Map(),
    user: new Map(),
  };

  @action
  emit<K extends DataModelsNames>(
    dataModelName: K,
    event: EventNames,
    model: DataModel<K>,
  ) {
    if (this.listeners[dataModelName].has(event)) {
      this.listeners[dataModelName].get(event)!.forEach((callback) => {
        callback(model);
      });
    }
    if ('emitSave' in model) {
      model.emitSave();
    }
  }

  @action
  on<K extends DataModelsNames>(
    dataModelName: K,
    event: EventNames,
    callback: (model: DataModels) => void,
  ) {
    if (!this.listeners[dataModelName].has(event)) {
      this.listeners[dataModelName].set(event, new Set());
    }
    this.listeners[dataModelName].get(event)!.add(callback);
  }

  @action
  off<K extends DataModelsNames>(
    dataModelName: K,
    event: EventNames,
    callback: (model: DataModels) => void,
  ) {
    if (this.listeners[dataModelName].has(event)) {
      this.listeners[dataModelName].get(event)!.delete(callback);
    }
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:store-event-emitter')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('store-event-emitter') declare altName: StoreEventEmitterService;`.
declare module '@ember/service' {
  interface Registry {
    'store-event-emitter': StoreEventEmitterService;
  }
}
