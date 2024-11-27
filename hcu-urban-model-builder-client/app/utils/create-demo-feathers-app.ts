import { feathers, type HookContext } from '@feathersjs/feathers';
import { MemoryService, type MemoryServiceOptions } from '@feathersjs/memory';

class NodesMemoryService extends MemoryService<any, any> {}
class EdgesMemoryService extends MemoryService<any, any> {}
class ModelVersionsMemoryService extends MemoryService<any, any> {}

const defaultMemoryServiceOptions: MemoryServiceOptions = {
  paginate: {
    default: 1000,
    max: 1000,
  },
  startId: 1,
};

export function createDemoFeathersApp() {
  const app = feathers();

  app.use('nodes', new NodesMemoryService(defaultMemoryServiceOptions));
  app.use('edges', new EdgesMemoryService(defaultMemoryServiceOptions));
  app.use(
    'models-versions',
    new ModelVersionsMemoryService(defaultMemoryServiceOptions),
  );

  app.hooks({
    before: {
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
  });

  return app;
}
