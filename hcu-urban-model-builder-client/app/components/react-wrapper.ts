import { createReact } from 'hcu-urban-model-builder-react-canvas/index.tsx';
import { action } from '@ember/object';
import Component from '@glimmer/component';
import { service } from '@ember/service';
import fade from 'ember-animated/transitions/fade';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

export interface ReactWrapperSignature {
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

export default class ReactWrapperComponent extends Component<ReactWrapperSignature> {
  private reactRoot: any | null = null;
  readonly transition = fade;

  @service declare emberReactConnector: EmberReactConnectorService;

  get canInsert() {
    return !!this.args.model;
  }

  get hasSelected() {
    return this.emberReactConnector.selected.length > 0;
  }

  get selectedSingleItem() {
    if (this.emberReactConnector.selected.length === 1) {
      return this.emberReactConnector.selected[0];
    }
    return null;
  }

  get selectedMultipleItems() {
    if (this.emberReactConnector.selected.length > 1) {
      return this.emberReactConnector.selected;
    }
    return null;
  }

  @action
  closeForm() {
    this.emberReactConnector.selected = [];
  }

  @action
  async didInsert(element: HTMLElement) {
    this.emberReactConnector.currentModel = this.args.model;

    if (this.reactRoot) {
      this.reactRoot.unmount();
    }

    this.reactRoot = createReact(
      element,
      await this.args.model.nodes,
      await this.args.model.edges,
      this.emberReactConnector,
      {
        disabled: !this.args.model.canEdit,
      },
    );
  }
}
