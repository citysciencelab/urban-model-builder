import Component from '@glimmer/component';
import { action } from '@ember/object';
import { Changeset, EmberChangeset } from 'ember-changeset';
import lookupValidator from 'ember-changeset-validations';
import { tracked } from '@glimmer/tracking';
import ModelCloneValidations from '../../validations/model-clone';
import type { FormModelClone } from 'global';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type EmberRouter from '@ember/routing/router';
import { inject as service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';

export interface ModelCloneDialogSignature {
  Args: {
    model: ModelsVersion;
    onClose: () => void;
  };
  Blocks: {
    default: [];
  };
  Element: null;
}

export default class ModelCloneDialogComponent extends Component<ModelCloneDialogSignature> {
  @service declare router: EmberRouter;
  @service intl!: IntlService;
  @tracked changeset!: EmberChangeset;
  @tracked formModel!: FormModelClone;

  get Validation() {
    return ModelCloneValidations(this.intl);
  }

  @action prepare() {
    this.formModel = {
      internalName: '',
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
      // Assuming some action like cloning happens here with this.formModel.internalName
      const newModelVersion = await this.args.model.cloneVersion(
        this.formModel,
      );

      // transition to the new clone
      this.router.transitionTo(
        'models.versions.show',
        newModelVersion!.modelId,
        newModelVersion!.id,
      );

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
