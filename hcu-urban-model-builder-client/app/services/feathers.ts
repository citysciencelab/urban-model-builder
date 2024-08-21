import type Owner from '@ember/owner';
import Service from '@ember/service';
import { feathers, type FeathersApplication } from '@feathersjs/feathers';
import socketio from '@feathersjs/socketio-client';
import io from 'socket.io-client';

export default class FeathersService extends Service {
  app: FeathersApplication;

  constructor(owner?: Owner) {
    super(owner);
    const socket = io('http://localhost:3030', { transports: ['websocket'] });
    this.app = feathers();

    this.app.configure(socketio(socket));
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
