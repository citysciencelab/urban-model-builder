import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import type Store from '@ember-data/store';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';

export default class ModelsIndexController extends Controller {
  @service declare store: Store;

  @tracked editedModel: null | ModelModel = null;

  @tracked
  modelName = '';

  @tracked
  isModalOpen = false;

  @action
  toggleModal() {
    this.isModalOpen = !this.isModalOpen;
  }

  @action
  async createModel() {
    if (this.editedModel) {
      this.editedModel.name = this.modelName;
      await this.editedModel.save();
      this.editedModel = null;
    } else {
      const newModel = this.store.createRecord('model', {
        name: this.modelName,
      }) as ModelModel;
      await newModel.save();
    }

    this.resetModal();
  }

  @action closeModal() {
    this.isModalOpen = false;
  }

  @action
  resetModal() {
    this.modelName = '';
    this.closeModal();
  }

  @action
  startDeleting(model: ModelModel) {
    const yes = confirm('Are you sure you want to delete this model?');
    if (yes) {
      model.destroyRecord();
    }
  }

  @action
  startEditing(model: ModelModel) {
    this.modelName = model.name;
    this.editedModel = model;
    this.toggleModal();
  }
}
