import Component from '@glimmer/component';

interface ModelsIndexHeaderArgs {
  onShowSearch: () => void;
  hasSearchQuery: boolean;
  q: string;
  _q: string;
  clearSearch: (dropdown: any) => void;
  onSearchChange: (event: Event) => void;
  sort_key: string;
  sort_direction: number;
  onSortChange: (key: string, direction: number) => void;
  startCreating: () => void;
}

export default class ModelsIndexHeader extends Component<ModelsIndexHeaderArgs> {}
