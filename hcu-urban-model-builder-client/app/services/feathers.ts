import type Owner from '@ember/owner';
import Service from '@ember/service';
import { type FeathersApplication } from '@feathersjs/feathers';
import socketio from '@feathersjs/socketio-client';
import io from 'socket.io-client';
import {
  createClient,
  type ClientApplication,
} from 'hcu-urban-model-builder-backend';

export default class FeathersService extends Service {
  app: ClientApplication;

  constructor(owner?: Owner) {
    super(owner);
    const socket = socketio(
      io('http://localhost:3030', { transports: ['websocket'] }),
    );

    this.app = createClient(socket);

    console.log(name);
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
