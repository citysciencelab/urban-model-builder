import { createClient } from 'hcu-urban-model-builder-backend';
import socketio from '@feathersjs/socketio-client';
import { io } from 'socket.io-client';
import ENV from 'hcu-urban-model-builder-client/config/environment';
import type { HookContext } from '@feathersjs/feathers';

export default function createDefaultFeathersApp(sessionService: any) {
  const socket = socketio(
    io(ENV.apiURL, {
      transports: ['websocket'],
      timeout: 5000,
      ackTimeout: 10000,
    }),
  );

  const app = createClient(socket, {
    jwtStrategy: 'oidc',
    storage: window.localStorage,
  });

  app.hooks({
    error: {
      all: [
        async (context: HookContext) => {
          console.error('Error in hook', context.error);
          if (
            ['TokenExpiredError', 'NotAuthenticated'].includes(
              context.error.name,
            )
          ) {
            await sessionService.invalidate();
          }
        },
      ],
    },
  });

  return app;
}
