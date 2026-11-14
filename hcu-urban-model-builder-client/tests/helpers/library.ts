import Service from '@ember/service';
import type { TestContext } from '@ember/test-helpers';
import type Store from '@ember-data/store';
import { NodeType } from 'hcu-urban-model-builder-backend';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';

/** A small system-dynamics graph with one geodata node. */
export const SD_GEO_NODES = [
  { id: 'n1', type: NodeType.Stock, position: { x: 0, y: 0 } },
  { id: 'n2', type: NodeType.Stock, position: { x: 400, y: 0 } },
  { id: 'n3', type: NodeType.Flow, position: { x: 200, y: 20 } },
  { id: 'n4', type: NodeType.OgcApiFeatures, position: { x: 200, y: 200 } },
];

/**
 * Replaces the Feathers service with one whose `nodes` service answers from
 * the given list (or a function of the version id), so Library components can load their model summary without
 * a backend. Returns the queries that were sent.
 */
export function stubNodesService(
  context: TestContext,
  nodes: unknown[] | ((versionId: string) => unknown[]),
) {
  const queries: { modelsVersionsId: string }[] = [];

  class FeathersStub extends Service {
    app = {
      service: () => ({
        find: async ({ query }: { query: { modelsVersionsId: string } }) => {
          queries.push(query);
          const data =
            typeof nodes === 'function' ? nodes(query.modelsVersionsId) : nodes;
          return { data, total: data.length, limit: 1000, skip: 0 };
        },
      }),
    };
  }

  context.owner.register('service:feathers', FeathersStub);
  return queries;
}

/** Pushes a model with one current version into the store. */
export function pushModel(
  context: TestContext,
  {
    id = 'm1',
    name = 'Housing demand Hamburg 2040',
    published = false,
    role = 4,
  }: { id?: string; name?: string; published?: boolean; role?: number } = {},
) {
  const store = context.owner.lookup('service:store') as Store;
  const versionId = `${id}-v`;
  const version = { type: 'models-version', id: versionId };

  store.push({
    data: [
      {
        ...version,
        attributes: {
          majorVersion: 1,
          minorVersion: 4,
          draftVersion: 0,
          isLatest: true,
          role,
          publishedAt: published ? new Date('2026-10-01T10:00:00.000Z') : null,
        },
      },
      {
        type: 'model',
        id,
        attributes: {
          internalName: name,
          description: 'What if 10 000 flats were built by 2040?',
          role,
          updatedAt: new Date('2026-10-19T08:00:00.000Z'),
        },
        relationships: {
          latestDraftVersion: { data: published ? null : version },
          latestPublishedVersion: { data: published ? version : null },
        },
      },
    ],
  } as Parameters<Store['push']>[0]);

  return store.peekRecord('model', id) as ModelModel;
}
