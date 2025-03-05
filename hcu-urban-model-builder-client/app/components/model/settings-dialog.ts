import Component from '@glimmer/component';
import { action } from '@ember/object';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import { Changeset, EmberChangeset } from 'ember-changeset';
import lookupValidator from 'ember-changeset-validations';
import { tracked } from '@glimmer/tracking';
import ModelSettingsValidations from '../../validations/model-settings';
import { inject as service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export interface ModelSettingsDialogSignature {
  Args: {
    model: ModelsVersion;
    onClose: () => void;
  };
  Blocks: {
    default: [];
  };
  Element: null;
}

export default class ModelSettingsDialogComponent extends Component<ModelSettingsDialogSignature> {
  @service intl!: IntlService;
  @tracked changeset!: EmberChangeset;

  timeUnits = [
    'Seconds',
    'Minutes',
    'Hours',
    'Days',
    'Weeks',
    'Months',
    'Years',
  ];
  algorithms = ['Euler', 'RK4'];

  get Validation() {
    return ModelSettingsValidations(this.intl);
  }

  @action prepare() {
    this.changeset = Changeset(
      this.args.model,
      lookupValidator(this.Validation),
      this.Validation,
    );
  }

  @action async onSubmit() {
    await this.changeset.validate();

    if (this.changeset.isValid) {
      this.changeset.execute();
      await this.args.model.save();
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
