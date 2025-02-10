import Component from '@glimmer/component';

export interface SidebarGeneralNavSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralNavComponent extends Component<SidebarGeneralNavSignature> {
  get navItems() {
    return [
      {
        id: 'modelInfo',
        icon: 'info',
      },
      {
        id: 'flows',
        icon: 'tune',
      },
      {
        id: 'settings',
        icon: 'settings',
      },
      {
        id: 'share',
        icon: 'share',
      },
    ];
  }
}
