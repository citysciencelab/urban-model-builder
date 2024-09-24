import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type RouterService from '@ember/routing/router-service';

export default class ModelsVersionsShowController extends Controller<ModelsVersion> {
  @tracked showSimulateModal = false;
  @service declare feathers: FeathersService;
  @service declare router: RouterService;

  get navbar() {
    return document.querySelector('#navbar-secondary');
  }

  @action async onCreateNewDraftVersion() {
    const currentModel = (await this.model).model;

    const newDraftModelVersion = await this.feathers.app
      .service('models')
      .newDraft({ id: Number(currentModel.id) });

    this.router.transitionTo('models.versions.show', newDraftModelVersion);
  }

  @action onStartPublish() {
    console.log('Starting publish');
  }
}
