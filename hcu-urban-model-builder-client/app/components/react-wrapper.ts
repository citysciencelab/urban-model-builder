import { initReact } from 'hcu-urban-model-builder-react-canvas/index.tsx';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import type Edge from 'hcu-urban-model-builder-client/models/edge';

export interface ReactWrapperSignature {
  // The arguments accepted by the component
  Args: {
    nodes: Node[];
    edges: Edge[];
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class ReactWrapperComponent extends Component<ReactWrapperSignature> {
  @service store!: Store;

  @tracked counter = 0;
  @tracked selected: (Node | Edge)[] = [];
  @tracked inReactContainer: HTMLElement | null = null;

  get canInsert() {
    return !!this.args.nodes || !!this.args.edges;
  }

  get nodeActions() {
    return {
      save: this.save,
      create: this.create,
      delete: this.delete,
      select: this.select,
      unselect: this.unselect,
    };
  }

  get selectedSingleItem() {
    if (this.selected.length === 1) {
      return this.selected[0];
    }
    return null;
  }

  get selectedMultipleItems() {
    if (this.selected.length > 1) {
      return this.selected;
    }
    return null;
  }

  @action
  didInsert(element: HTMLElement) {
    initReact(element, this.args.nodes, this.args.edges, this.nodeActions);
  }

  @action
  async save(type: 'node' | 'edge', id: string, rawData: any) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }

    const data = { ...rawData };
    for (const key of ['source', 'target']) {
      console.log('createNode', key, rawData[key]);

      if (key in rawData) {
        data[key] = this.store.peekRecord<Node>('node', rawData[key]);
      }
    }
    Object.assign(record, data);
    await record.save();
  }

  @action
  async create(type: 'node' | 'edge', rawData: any) {
    const data = { ...rawData };
    for (const key of ['source', 'target']) {
      console.log('createNode', key, rawData[key]);

      if (key in rawData) {
        data[key] = this.store.peekRecord<Node>('node', rawData[key]);
      }
    }

    return this.store.createRecord<Node | Edge>(type, data).save();
  }

  @action
  async delete(type: 'node' | 'edge', id: string) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    record.deleteRecord();
    await record.save();
  }

  @action
  select(type: 'node' | 'edge', id: string) {
    console.log('select', type, id);
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    this.selected = [...this.selected, record];
  }

  @action
  unselect(type: 'node' | 'edge', id: string) {
    console.log('unselect', type, id);
    this.selected = this.selected.filter((r) => r.id !== id);
  }
}
