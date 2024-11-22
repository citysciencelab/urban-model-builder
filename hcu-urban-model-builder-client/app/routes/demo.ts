import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';

export default class DemoRoute extends Route {
  @service declare store: Store;
  @service declare feathers: FeathersService;
  @service declare session: any;
  @service declare router: RouterService;

  beforeModel() {
    if (this.session.isAuthenticated) {
      this.router.transitionTo('models');
    }
  }

  async model() {
    this.feathers.enableDemoMode();

    const model = await this.store
      .createRecord<ModelsVersion>('models-version', {
        majorVersion: 0,
        minorVersion: 0,
        draftVersion: 1,
        isLatest: true,
        timeStart: 0,
        timeLength: 20,
        timeStep: 1,
        algorithm: 'Euler',
        timeUnits: 'Years',
        globals: '',
        role: 4,
      })
      .save();

    return this.store.peekRecord<ModelsVersion>('models-version', model.id!);
  }

  willTransition() {
    this.feathers.disableDemoMode();
  }
}
