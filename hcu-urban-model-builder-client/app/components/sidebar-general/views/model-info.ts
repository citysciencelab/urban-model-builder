import Component from '@glimmer/component';
import { service } from '@ember/service';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import lookupValidator from 'ember-changeset-validations';
import modelValidator from 'hcu-urban-model-builder-client/validations/model';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type IntlService from 'ember-intl/services/intl';

export interface SidebarGeneralViewsModelInfoSignature {
  // The arguments accepted by the component
  Args: {
    onShowSettingsDialog: (value: boolean) => void;
    modelVersion: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralViewsModelInfoComponent extends Component<SidebarGeneralViewsModelInfoSignature> {
  @service declare modelDialogs: ModelDialogsService;
  @service declare intl: IntlService;

  @tracked record: ModelModel | null = null;
  @tracked changeset: TrackedChangeset<ModelModel> | null = null;

  get validator() {
    return lookupValidator(modelValidator(this.intl));
  }

  @action onAutoSave() {
    if (this.changeset?.isDirty) {
      this.changeset.saveTask.perform();
    }
  }

  @action async initialize() {
    this.record = await this.args.modelVersion.model;
    this.changeset = new TrackedChangeset(this.record!, this.validator);
  }
}
