import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type RouterService from '@ember/routing/router-service';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';

export interface SidebarGeneralViewsShareSignature {
  // The arguments accepted by the component
  Args: {
    modelVersion: ModelsVersion;
    onShowSimulateDialog: (value: boolean) => void;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralViewsShareComponent extends Component<SidebarGeneralViewsShareSignature> {
  @service declare modelDialogs: ModelDialogsService;
  @service declare feathers: FeathersService;
  @service declare router: RouterService;

  @action async onCreateNewDraftVersion() {
    const currentModel = await this.args.modelVersion.model;

    const newDraftModelVersion = await this.feathers.app
      .service('models')
      .newDraft({ id: currentModel!.id! });

    const newDraftModelVersionModel = this.feathers.pushRecordIntoStore(
      'models-version',
      newDraftModelVersion,
    );

    await this.router.transitionTo(
      'models.versions.show',
      newDraftModelVersionModel,
    );
  }
}
