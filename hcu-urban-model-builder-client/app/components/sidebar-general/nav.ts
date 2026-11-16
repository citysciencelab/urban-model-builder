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
        id: 'scenarios',
        icon: 'tune',
      },
      {
        id: 'share',
        icon: 'share',
      },
      {
        id: 'assistant',
        icon: 'smart_toy',
      },
      {
        id: 'settings',
        icon: 'settings',
      },
    ];
  }
}
