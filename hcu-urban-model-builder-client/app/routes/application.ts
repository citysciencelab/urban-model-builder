import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type Edge from 'hcu-urban-model-builder-client/models/edge';

export default class ApplicationRoute extends Route {
  @service store!: Store;

  async model() {
    return {
      nodes: await this.store.findAll<Node>('node', {}),
      edges: await this.store.findAll<Edge>('edge', {}),
    };
  }
}
