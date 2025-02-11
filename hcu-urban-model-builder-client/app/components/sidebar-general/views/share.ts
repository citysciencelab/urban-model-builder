import Component from '@glimmer/component';
import { action } from '@ember/object';

export interface SidebarGeneralViewsShareSignature {
  // The arguments accepted by the component
  Args: {
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
  get navbar() {
    return document.querySelector('#version-settings');
  }

  @action onShowSimulateDialog() {
    this.args.onShowSimulateDialog(true);
  }
}
