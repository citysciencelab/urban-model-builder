import { next } from '@ember/runloop';
import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import type Store from '@ember-data/store';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import ModelValidations from '../../validations/model';
import lookupValidator from 'ember-changeset-validations';
import { Changeset, EmberChangeset } from 'ember-changeset';
import IntlService from 'ember-intl/services/intl';
import { isEmpty } from '@ember/utils';
import type UserService from 'hcu-urban-model-builder-client/services/user';

export default class ModelsIndexController extends Controller<ModelModel[]> {
  @service declare store: Store;
  @service intl!: IntlService;
  @service declare user: UserService;

  @tracked isModalOpen = false;
  @tracked changeset!: EmberChangeset;
  @tracked mode = '';
  @tracked sort_key = 'createdAt';
  @tracked sort_direction: number = -1;
  @tracked page = 1;
  @tracked limit = 10;
  @tracked q = '';
  @tracked _q = '';

  queryParams = ['sort_key', 'sort_direction', 'page', 'limit', 'q'];

  get Validation() {
    return ModelValidations(this.intl);
  }

  get persistedModels() {
    return this.model.filter((item) => !item.isNew);
  }

  get hasSearchQuery() {
    return !isEmpty(this.q);
  }

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
    if (this.changeset.get('isDirty')) {
      const yes = confirm(this.intl.t('actions.unsaved_changes'));
      if (yes && this.changeset['isNew']) {
        this.changeset.get('_content').deleteRecord();
      } else if (yes) {
        this.changeset.rollback();
      } else {
        return false;
      }
    } else if (!this.changeset.isDirty && this.changeset['isNew']) {
      this.changeset.get('_content').deleteRecord();
    }

    this.mode = '';
    this.isModalOpen = false;
  }

  @action startCreating() {
    this.mode = 'create';
    const modelModel = this.store.createRecord('model', {
      internalName: '',
      description: '',
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

  @action onSortChange(key: string, direction: number) {
    this.page = 1;
    this.sort_key = key;
    this.sort_direction = direction;
  }

  @action onPageChanged(pageNum: number) {
    this.page = pageNum;
  }

  @action onLimitChanged(limit: number) {
    this.limit = limit;
    this.page = 1;
  }

  @action onSearchChange() {
    this.q = this._q;
  }

  @action onShowSearch() {
    this._q = this.q;
    next(() => {
      (
        document.getElementById('model-search-input') as HTMLInputElement
      )?.select();
    });
  }

  @action clearSearch(dd: any) {
    dd.closeDropdown();
    this._q = '';
    this.onSearchChange();
  }
}
