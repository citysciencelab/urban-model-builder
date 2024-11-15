import type Store from '@ember-data/store';
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

export default class DemoRoute extends Route {
  @service declare store: Store;

  async model() {
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
    return this.store.peekRecord<any>('models-version', model.id!);
  }
}
