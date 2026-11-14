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
import type RouterService from '@ember/routing/router-service';

export type LibraryView = 'grid' | 'table';

/**
 * The Library: "My models" (`models.index`) and "Public models"
 * (`public-models`) share this controller and the `models/index` template.
 */
export default class ModelsIndexController extends Controller<ModelModel[]> {
  @service declare store: Store;
  @service declare router: RouterService;
  @service intl!: IntlService;
  @service declare user: UserService;

  @tracked isModalOpen = false;
  @tracked changeset!: EmberChangeset;
  @tracked mode = '';
  // Last edited first: the Library opens with the model to continue.
  @tracked sort_key = 'updatedAt';
  @tracked sort_direction: number = -1;
  @tracked page = 1;
  @tracked limit = 12;
  @tracked q = '';
  @tracked view: LibraryView = 'grid';

  queryParams = ['sort_key', 'sort_direction', 'page', 'limit', 'q', 'view'];

  get isPublic() {
    return this.router.currentRouteName === 'public-models';
  }

  get total(): number {
    const { meta } = this.model as ModelModel[] & {
      meta?: { total?: number };
    };
    return meta?.total ?? this.persistedModels.length;
  }

  /**
   * "Continue": the most recently edited of my models spans two columns. Only
   * where "first in the list" really means that.
   */
  get featuredModelId() {
    const isLastEditedFirst =
      this.sort_key === 'updatedAt' && this.sort_direction === -1;

    if (
      this.isPublic ||
      !isLastEditedFirst ||
      this.page !== 1 ||
      this.hasSearchQuery ||
      this.persistedModels.length < 2
    ) {
      return null;
    }
    return this.persistedModels[0]?.id ?? null;
  }

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

  @action onViewChange(view: LibraryView) {
    this.view = view;
  }

  @action onSearch(event: Event) {
    this.q = (event.target as HTMLInputElement).value.trim();
    this.page = 1;
  }

  @action clearSearch() {
    this.q = '';
    this.page = 1;
  }
}
