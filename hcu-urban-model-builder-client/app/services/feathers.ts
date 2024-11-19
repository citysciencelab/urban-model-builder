import type Owner from '@ember/owner';
import Service from '@ember/service';
import socketio from '@feathersjs/socketio-client';
import io from 'socket.io-client';
import {
  createClient,
  type ClientApplication,
  type ServiceTypes,
} from 'hcu-urban-model-builder-backend';
import { dasherize } from '@ember/string';
import { pluralize, singularize } from '@ember-data/request-utils/string';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import type StoreEventEmitterService from './store-event-emitter';
import type { DataModelsNames } from './store-event-emitter';
import { feathers, type HookContext } from '@feathersjs/feathers';
import ENV from 'hcu-urban-model-builder-client/config/environment';
import { MemoryService } from '@feathersjs/memory';
import type Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import { tracked } from '@glimmer/tracking';
import createDefaultFeathersApp from 'hcu-urban-model-builder-client/utils/create-default-feathers-app';
import { createDemoFeathersApp } from 'hcu-urban-model-builder-client/utils/create-demo-feathers-app';

export default class FeathersService extends Service {
  declare app: ClientApplication;

  @service() declare store: Store;
  @service() declare storeEventEmitter: StoreEventEmitterService;
  @service() declare session: any;

  constructor(owner?: Owner) {
    super(owner);

    this.createDefaultApp();
  }

  enableDemoMode() {
    this.unregisterEventListeners();
    this.app = createDemoFeathersApp();
  }

  disableDemoMode() {
    this.createDefaultApp();
  }

  createDefaultApp() {
    this.app = createDefaultFeathersApp(this.session);
    this.registerEventListeners();
  }

  private registerEventListeners() {
    for (const serviceName of Object.keys(this.app.services)) {
      const service = this.app.service(serviceName as keyof ServiceTypes);
      const modelName = this.getModelNameByServiceName(serviceName);
      service.on('created', this.onCreated.bind(this, modelName));
      service.on('patched', this.onPatched.bind(this, modelName));
      service.on('removed', this.onRemoved.bind(this, modelName));
    }
  }

  private unregisterEventListeners() {
    for (const serviceName of Object.keys(this.app.services)) {
      const service = this.app.service(serviceName as keyof ServiceTypes);
      service.removeListener('created', this.onCreated);
      service.removeListener('patched', this.onPatched);
      service.removeListener('removed', this.onRemoved);
    }
  }

  private onCreated(
    modelName: DataModelsNames,
    record: { id: number | string },
  ) {
    const recordInStore: any = this.store.peekRecord(modelName, record.id);

    if (!recordInStore) {
      const modelInstance: any = this.pushRecordIntoStore(modelName, record);
      if (modelInstance) {
        this.storeEventEmitter.emit(modelName, 'created', modelInstance);
      }
    }
  }

  private onPatched(
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
      }
    }
  }

  private onRemoved(
    modelName: DataModelsNames,
    record: { id: number | string },
  ) {
    const recordInStore: any = this.store.peekRecord(modelName, record.id);
    if (recordInStore && !recordInStore.isDeleted) {
      recordInStore.unloadRecord();
      this.storeEventEmitter.emit(modelName, 'deleted', recordInStore);
    }
  }

  private pushRecordIntoStore(modelName: DataModelsNames, record: any) {
    const normalizedRecord = (this.store as any).normalize(modelName, record);
    return this.store.push(normalizedRecord);
  }

  private getServiceNameByModelName(modelName: string) {
    return modelName.split('/').reduce((accumulator, currentValue, index) => {
      const separator = index === 0 ? '' : '/';
      const dasherized = dasherize(currentValue);
      return `${accumulator}${separator}${pluralize(dasherized)}`;
    }, '') as any;
  }

  private getModelNameByServiceName(serviceName: string) {
    return serviceName.split('/').reduce((accumulator, currentValue, index) => {
      const separator = index === 0 ? '' : '/';
      return `${accumulator}${separator}${singularize(currentValue)}`;
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
