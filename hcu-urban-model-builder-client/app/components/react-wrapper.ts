import { initReact } from 'hcu-urban-model-builder-react-canvas/index.tsx';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';

export interface ReactWrapperSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class ReactWrapperComponent extends Component<ReactWrapperSignature> {
  @tracked counter = 0;

  @action
  didInsert(element: HTMLElement) {
    initReact(element, this);
  }
}
