import Component from '@glimmer/component';

export interface SidebarGeneralSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralComponent extends Component<SidebarGeneralSignature> {}
