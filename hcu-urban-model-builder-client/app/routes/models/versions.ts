import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ModelsVersionsRoute extends Route {
  @service declare store: Store;

  model(params: { id: string }) {
    return this.store.findRecord('model', params.id);
  }
}
