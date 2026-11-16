import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type SaveStatusService from 'hcu-urban-model-builder-client/services/save-status';

export default class ModelsShowRoute extends Route {
  @service declare store: Store;
  @service declare saveStatus: SaveStatusService;

  activate() {
    // The title block shows the save state of the model that is open.
    this.saveStatus.reset();
  }

  model(params: { version_id: string }) {
    return this.store.findRecord('models-version', params.version_id);
  }

  async afterModel(model: ModelsVersion) {
    // preload scenarios and scenariosValues for simulation
    const scenarios = await model.scenarios;
    for (const scenario of scenarios) {
      await scenario.scenariosValues;
    }
  }
}
