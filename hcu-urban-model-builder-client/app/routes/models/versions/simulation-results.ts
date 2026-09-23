import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

export default class ModelsSimulationResultsRoute extends Route {
  @service declare store: Store;

  model(params: { version_id: string }) {
    return this.store.findRecord('models-version', params.version_id);
  }

  async afterModel(model: ModelsVersion) {
    // the breadcrumb shows the model name
    await model.model;
  }
}
