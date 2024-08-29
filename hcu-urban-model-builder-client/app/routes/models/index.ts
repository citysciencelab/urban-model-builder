import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ModelsIndexRoute extends Route {
  @service declare store: Store;

  async model() {
    return this.store.findAll('model');
  }
}
