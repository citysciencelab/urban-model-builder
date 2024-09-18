import Component from '@glimmer/component';

export interface UiPaginationSignature {
  // The arguments accepted by the component
  Args: {
    total: number;
    limit: number;
    page: number;
    onPageChanged: (pageNum: number) => void;
    onLimitChanged: (limit: number) => void;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class UiPaginationComponent extends Component<UiPaginationSignature> {
  get lastPage() {
    return Math.ceil(this.args.total / this.args.limit);
  }
  get pages() {
    return Array.from({ length: this.lastPage }, (_, i) => i + 1);
  }
  get prevPage() {
    return Math.max(this.args.page - 1, 1);
  }
  get nextPage() {
    return Math.min(this.args.page + 1, this.lastPage);
  }
  get start() {
    return (this.args.page - 1) * this.args.limit + 1;
  }

  get end() {
    return Math.min(this.args.page * this.args.limit, this.args.total);
  }

  get limits() {
    return [10, 50, 100];
  }
}
