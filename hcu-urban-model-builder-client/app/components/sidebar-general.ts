import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import { ensureSafeComponent } from '@embroider/util';
import { importSync } from '@embroider/macros';
import { dasherize } from '@ember/string';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';

export interface SidebarGeneralSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralComponent extends Component<SidebarGeneralSignature> {
  @tracked isMinimized = false;
  @tracked activeView = 'modelInfo';
  @service declare modelDialogs: ModelDialogsService;

  get sidebarViewComponent() {
    if (!this.activeView) {
      return null;
    }
    try {
      const fileName = dasherize(this.activeView);
      const module = importSync(`./sidebar-general/views/${fileName}`) as any;

      return ensureSafeComponent(module.default, this);
    } catch (e) {
      console.debug(e);
      return null;
    }
  }

  @action minimize() {
    this.isMinimized = !this.isMinimized;
  }

  @action selectActiveView(view: string) {
    if (view == 'settings') {
      this.modelDialogs.onShowSettingsDialog();
    } else {
      this.isMinimized = false;
      this.activeView = view;
    }
  }
}
