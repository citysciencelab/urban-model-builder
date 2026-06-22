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
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type RouterService from '@ember/routing/router-service';

export default class ModelsIndexController extends Controller<ModelModel[]> {
  @service declare store: Store;
  @service intl!: IntlService;
  @service declare user: UserService;
  @service declare feathers: FeathersService;
  @service declare router: RouterService;

  @tracked isModalOpen = false;
  @tracked changeset!: EmberChangeset;
  @tracked importFile: File | null = null;
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
      if (this.mode === 'create' && this.importFile) {
        // Creating a model from JSON is a separate backend import flow from the
        // regular Ember Data save. The backend returns the new model plus the
        // version we should open right away.
        const payload = JSON.parse(await this.importFile.text());
        const result = await (this.feathers.app.service('models') as any).importModel(
          {
            payload,
            internalName: this.changeset.get('internalName'),
          },
        );

        if (result.model) {
          this.feathers.pushRecordIntoStore('model', result.model);
        }

        const importedVersion = this.feathers.pushRecordIntoStore(
          'models-version',
          result.modelVersion,
        );

        await this.reloadModelsList();
        this.closeModal(true);
        await this.router.transitionTo('models.versions.show', importedVersion);
        return;
      }

      await this.changeset.save();
      await this.reloadModelsList();
      this.closeModal(true);
    } else {
      console.error('Validation failed');
    }
  }

  private async reloadModelsList() {
    // `importModel` is a custom Feathers method, so it does not emit the normal
    // `model.created` event that the list route listens to. Re-query here so the
    // menu/list reflects the imported model immediately.
    const query: any = {
      $skip: (this.page - 1) * this.limit,
      $limit: this.limit,
      $me: true,
    };

    if (this.sort_key) {
      query.$sort = {
        [this.sort_key]: this.sort_direction,
      };
    }

    if (this.q && this.q !== '') {
      query.internalName = {
        $ilike: `%${this.q}%`,
      };
    }

    this.model = await this.store.query('model', query);
  }

  @action openModal() {
    this.isModalOpen = true;
  }

  @action closeModal(force = false) {
    if (!force && this.changeset.get('isDirty')) {
      const yes = confirm(this.intl.t('actions.unsaved_changes'));
      if (yes && this.changeset['isNew']) {
        this.changeset.get('_content').deleteRecord();
      } else if (yes) {
        this.changeset.rollback();
      } else {
        return false;
      }
    } else if (this.changeset['isNew']) {
      this.changeset.get('_content').deleteRecord();
    }

    this.mode = '';
    this.importFile = null;
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
    this.importFile = null;

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
  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.importFile = input.files?.[0] ?? null;
  }

  @action
  startDeleting(model: ModelModel) {
    const yes = confirm(this.intl.t('actions.confirm_delete_model'));
    if (yes) {
      model.destroyRecord();
    }
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
