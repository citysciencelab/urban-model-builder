import Component from '@glimmer/component';
import { action } from '@ember/object';

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
  @action onShowSettingsDialog() {
    this.args.onShowSettingsDialog(true);
  }
}
