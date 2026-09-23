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

  // The packaged client does not yet know about every custom models method.
  app.use('models', socket.service('models'), {
    methods: [
      'find',
      'get',
      'create',
      'patch',
      'remove',
      'simulate',
      'newDraft',
      'publishMinor',
      'publishMajor',
      'cloneVersion',
      'exportModel',
      'importModel',
      'saveSimulationResult',
      'findSimulationResults',
      'renameSimulationResult',
    ],
  });

  app.use('models-versions', socket.service('models-versions'), {
    methods: [
      'find',
      'get',
      'create',
      'patch',
      'remove',
      'joinChannel',
      'leaveChannel',
      'exportVersion',
      'importVersion',
    ],
  });

  app.hooks({
    error: {
      all: [
        async (context: HookContext) => {
          const isModelVersionChannelPermissionError =
            context.path === 'models-versions' &&
            ['joinChannel', 'leaveChannel'].includes(context.method) &&
            context.error?.code === 403;

          if (!isModelVersionChannelPermissionError) {
            console.error('Error in hook', context.error);
          }
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
