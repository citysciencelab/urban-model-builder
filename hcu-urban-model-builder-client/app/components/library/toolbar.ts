import Component from '@glimmer/component';

export interface LibraryToolbarSignature {
  Args: {
    q: string;
    sortKey: string;
    sortDirection: number;
    view: 'grid' | 'table';
    onSearch: (event: Event) => void;
    onClearSearch: () => void;
    onSortChange: (key: string, direction: number) => void;
    onViewChange: (view: 'grid' | 'table') => void;
    /** Omit to hide the primary "New model" action (Public models). */
    onCreate?: () => void;
  };
  Element: HTMLDivElement;
}

export default class LibraryToolbarComponent extends Component<LibraryToolbarSignature> {
  readonly sortOptions = [
    { key: 'updatedAt', direction: -1 },
    { key: 'createdAt', direction: -1 },
    { key: 'createdAt', direction: 1 },
  ];
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Library::Toolbar': typeof LibraryToolbarComponent;
  }
}
