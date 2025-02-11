import Component from '@glimmer/component';
import { action } from '@ember/object';

export interface SvgIconSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SvgIconComponent extends Component<SvgIconSignature> {
  @action getSize(size: string) {
    switch (size) {
      case 'xs':
        return '1rem';
      case 'sm':
        return '1.25rem';
      case 'md':
        return '1.5rem';
      case 'lg':
        return '1.75rem';
      case 'xl':
        return '2rem';
      case '2xl':
        return '2.5rem';
      default:
        return '1.5rem';
    }
  }
}
