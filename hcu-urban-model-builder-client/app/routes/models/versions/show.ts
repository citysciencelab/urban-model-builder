import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ModelsShowRoute extends Route {
  @service declare store: Store;

  model(params: { version_id: string }) {
    return this.store.findRecord('models-version', params.version_id);
  }
}
