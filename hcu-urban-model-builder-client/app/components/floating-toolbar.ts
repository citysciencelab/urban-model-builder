import Component from '@glimmer/component';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';

export interface FloatingToolbarSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelModel;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class FloatingToolbarComponent extends Component<FloatingToolbarSignature> {}
