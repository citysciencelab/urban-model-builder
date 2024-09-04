import type Owner from '@ember/owner';
import Service from '@ember/service';
import socketio from '@feathersjs/socketio-client';
import io from 'socket.io-client';
import {
  createClient,
  type ClientApplication,
  type ServiceTypes,
} from 'hcu-urban-model-builder-backend';
import { camelize, dasherize } from '@ember/string';
import { pluralize, singularize } from '@ember-data/request-utils/string';
import { action } from '@ember/object';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import type StoreEventEmitterService from './store-event-emitter';
import type { DataModel, DataModelsNames } from './store-event-emitter';
import model from '@ember-data/model';

export default class FeathersService extends Service {
  app: ClientApplication;

  @service() declare store: Store;
  @service() declare storeEventEmitter: StoreEventEmitterService;

  constructor(owner?: Owner) {
    super(owner);
    const socket = socketio(
      io('http://localhost:3030', { transports: ['websocket'] }),
    );

    this.app = createClient(socket);
    this.registerEventListeners();
  }

  registerEventListeners() {
    for (const serviceName of Object.keys(this.app.services)) {
      const service = this.app.service(serviceName as keyof ServiceTypes);
      const modelName = this.getModelNameByServiceName(serviceName);
      service.on('created', this.onCreated.bind(this, modelName));
      service.on('patched', this.onPatched.bind(this, modelName));
      service.on('removed', this.onRemoved.bind(this, modelName));
    }
  }

  onCreated(modelName: DataModelsNames, record: { id: number | string }) {
    const recordInStore: any = this.store.peekRecord(modelName, record.id);

    if (!recordInStore) {
      const modelInstance: any = this.pushRecordIntoStore(modelName, record);
      if (modelInstance) {
        this.storeEventEmitter.emit(modelName, 'created', modelInstance);
      }
    } else {
      this.storeEventEmitter.emit(modelName, 'created', recordInStore);
    }
  }

  onPatched(
    modelName: DataModelsNames,
    record: { id: number | string; updatedAt: Date },
  ) {
    const recordInStore: any = this.store.peekRecord(modelName, record.id);
    if (
      !recordInStore ||
      new Date(record.updatedAt).getTime() > recordInStore.updatedAt.getTime()
    ) {
      const modelInstance: any = this.pushRecordIntoStore(modelName, record);
      if (modelInstance) {
        this.storeEventEmitter.emit(modelName, 'updated', modelInstance);
        if ('emitSave' in modelInstance) {
          modelInstance.emitSave();
        }
      }
    }
  }

  onRemoved(modelName: DataModelsNames, record: { id: number | string }) {
    const recordInStore: any = this.store.peekRecord(modelName, record.id);
    if (recordInStore) {
      recordInStore.unloadRecord();
      this.storeEventEmitter.emit(modelName, 'deleted', recordInStore);
    }
  }

  pushRecordIntoStore(modelName: DataModelsNames, record: any) {
    const normalizedRecord = (this.store as any).normalize(modelName, record);
    return this.store.push(normalizedRecord);
  }

  getServiceNameByModelName(modelName: string) {
    return modelName.split('/').reduce((accumulator, currentValue, index) => {
      const separator = index === 0 ? '' : '/';
      const dasherized = dasherize(currentValue);
      return `${accumulator}${separator}${pluralize(dasherized)}`;
    }, '') as any;
  }

  getModelNameByServiceName(serviceName: string) {
    return serviceName.split('/').reduce((accumulator, currentValue, index) => {
      const separator = index === 0 ? '' : '/';
      const camelized = camelize(currentValue);
      return `${accumulator}${separator}${singularize(camelized)}`;
    }, '') as DataModelsNames;
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:feathers')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('feathers') declare altName: FeathersService;`.
declare module '@ember/service' {
  interface Registry {
    feathers: FeathersService;
  }
}
