import Component from '@glimmer/component';
import { service } from '@ember/service';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';

export interface SidebarGeneralViewsModelInfoSignature {
  // The arguments accepted by the component
  Args: {
    onShowSettingsDialog: (value: boolean) => void;
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
}
