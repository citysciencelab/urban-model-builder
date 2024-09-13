import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import type Store from '@ember-data/store';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import ModelValidations from '../../validations/model';
import lookupValidator from 'ember-changeset-validations';
import { Changeset, EmberChangeset } from 'ember-changeset';

export default class ModelsIndexController extends Controller {
  @service declare store: Store;

  Validation = ModelValidations;
  @tracked isModalOpen = false;
  @tracked changeset!: EmberChangeset;
  @tracked mode = '';

  @action
  async submitModel() {
    await this.changeset.validate();

    if (this.changeset.isValid) {
      await this.changeset.save();
      this.closeModal();
    } else {
      console.error('Validation failed');
    }
  }

  @action openModal() {
    this.isModalOpen = true;
  }

  @action closeModal() {
    this.mode = '';
    this.isModalOpen = false;
  }

  @action startCreating() {
    this.mode = 'create';
    const modelModel = this.store.createRecord('model', {
      name: '',
    }) as ModelModel;

    this.changeset = Changeset(
      modelModel,
      lookupValidator(this.Validation),
      this.Validation,
    );

    this.openModal();
  }

  @action
  startEditing(modelModel: ModelModel) {
    this.mode = 'edit';
    this.changeset = Changeset(
      modelModel,
      lookupValidator(this.Validation),
      this.Validation,
    );

    this.openModal();
  }

  @action
  startDeleting(model: ModelModel) {
    const yes = confirm('Are you sure you want to delete this model?');
    if (yes) {
      model.destroyRecord();
    }
  }

  @action
  focusFirstInputElement(el: HTMLElement) {
    if (!el) return;
    setTimeout(() => {
      const firstInputEl = el.querySelector('input');
      if (firstInputEl) {
        firstInputEl?.focus();
      }
    }, 50);
  }
}
