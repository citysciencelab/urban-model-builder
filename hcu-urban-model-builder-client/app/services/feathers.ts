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

class NodesMemoryService extends MemoryService<any, any> { }
class EdgesMemoryService extends MemoryService<any, any> { }
class ModelVersionsMemoryService extends MemoryService<any, any> { }

const defaultPaginate = {
  default: 1000,
  max: 1000,
};

export default class FeathersService extends Service {
  app: ClientApplication;

  @service() declare store: Store;
  @service() declare storeEventEmitter: StoreEventEmitterService;
  @service() declare session: any;
  @service declare router: RouterService;

  get isDemoMode() {
    return this.router.currentRouteName?.startsWith('demo');
  }

  constructor(owner?: Owner) {
    super(owner);
    const socket = socketio(
      io(ENV.apiURL, {
        transports: ['websocket'],
        timeout: 5000,
        ackTimeout: 10000,
      }),
    );

    this.app = feathers();

    // this.app = createClient(socket, {
    //   jwtStrategy: 'oidc',
    //   storage: window.localStorage,
    // });

    // const jwt = this.session.data.authenticated.access_token;
    // this.app
    //   .authenticate({
    //     strategy: 'oidc',
    //     accessToken: jwt,
    //     updateEntity: true,
    //   })
    //   .then((data: any) => {
    //     this.session.set('data.authenticated.userinfo.id', data.user.id);
    //     // Update local storage for re-connection.
    //     window.localStorage.setItem('feathers-jwt', jwt);
    //   })
    //   .catch((e) => {
    //     console.error('Authentication error', e);
    //   });

    this.app.use(
      'nodes',
      new NodesMemoryService({ paginate: defaultPaginate, startId: 1 }) as any,
    );
    this.app.use(
      'edges',
      new EdgesMemoryService({ paginate: defaultPaginate, startId: 1 }) as any,
    );
    this.app.use(
      'models-versions',
      new ModelVersionsMemoryService({
        paginate: defaultPaginate,
        startId: 1,
      }) as any,
    );

    this.app.hooks({
      before: {
        all: [
          async (context: HookContext) => {
            console.log(
              'before all',
              context.path,
              context.method,
              context.type,
              context.data,
              context.params,
            );
          },
        ],
        create: [
          async (context: HookContext) => {
            context.data.createdAt = new Date().toISOString();
            context.data.updatedAt = new Date().toISOString();
          },
        ],
        patch: [
          async (context: HookContext) => {
            context.data.updatedAt = new Date().toISOString();
          },
        ],
      },
      after: {
        all: [
          async (context: HookContext) => {
            console.log(
              'before all',
              context.path,
              context.method,
              context.type,
              context.params,
              context.result,
              context.service.store,
            );
          },
        ],
      },
      error: {
        all: [
          async (context: HookContext) => {
            console.error('Error in hook', context.error);
            if (
              ['TokenExpiredError', 'NotAuthenticated'].includes(
                context.error.name,
              )
            ) {
              await this.session.invalidate();
            }
          },
        ],
      },
    });

    // this.registerEventListeners();
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
    }
  }

  onPatched(
    modelName: DataModelsNames,
    record: { id: number | string; updatedAt: Date },
  ) {
    const recordInStore: any = this.store.peekRecord(modelName, record.id);
    console.log('recordInStore', recordInStore.updatedAt instanceof Date);

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

  onRemoved(modelName: DataModelsNames, record: { id: number | string }) {
    const recordInStore: any = this.store.peekRecord(modelName, record.id);
    if (recordInStore && !recordInStore.isDeleted) {
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
