import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Node from 'hcu-urban-model-builder-client/models/node';

export default class ApplicationRoute extends Route {
  @service store!: Store;

  async model() {
    return this.store.findAll<Node>('node', {});
  }
}
