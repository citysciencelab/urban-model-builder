import Component from '@glimmer/component';
import { action } from '@ember/object';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import { Changeset, EmberChangeset } from 'ember-changeset';
import lookupValidator from 'ember-changeset-validations';
import { tracked } from '@glimmer/tracking';
import ModelPublishValidations from '../../validations/model-publish';
import type { FormModelPublish } from 'global';
import { inject as service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export interface ModelPublishDialogSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelsVersion;
    onClose: () => void;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class ModelPublishDialogComponent extends Component<ModelPublishDialogSignature> {
  @service intl!: IntlService;
  @tracked changeset!: EmberChangeset;
  @tracked formModel!: FormModelPublish;

  versionTypes = ['minor', 'major'];

  get Validation() {
    return ModelPublishValidations(this.intl);
  }

  @action prepare() {
    this.formModel = {
      notes: '',
      versionType: 'minor',
    };
    this.changeset = Changeset(
      this.formModel,
      lookupValidator(this.Validation),
      this.Validation,
    );
  }

  @action async onSubmit() {
    await this.changeset.validate();

    if (this.changeset.isValid) {
      this.changeset.execute();
      if (this.formModel.versionType === 'minor') {
        await this.args.model.publishMinor(this.formModel);
      } else if (this.formModel.versionType === 'major') {
        await this.args.model.publishMajor(this.formModel);
      }
      // close the dialog
      this.args.onClose();
    } else {
      console.dir(this.changeset.errors);
    }
  }

  @action onHide() {
    this.args.onClose();
    return false;
  }
}
