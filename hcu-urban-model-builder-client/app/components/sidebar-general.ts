import Component from '@glimmer/component';
import { action } from '@ember/object';
import type Scenario from 'hcu-urban-model-builder-client/models/scenario';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';
import { service } from '@ember/service';
import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';
import { tracked } from '@glimmer/tracking';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import { load } from 'ember-async-data';
import type Store from '@ember-data/store';
import { ensureSafeComponent } from '@embroider/util';
import { importSync } from '@embroider/macros';
import { dasherize } from '@ember/string';

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
    this.isMinimized = false;
    this.activeView = view;
  }
}
