import { initReact } from 'hcu-urban-model-builder-react-canvas/index.tsx';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import type Edge from 'hcu-urban-model-builder-client/models/edge';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import fade from 'ember-animated/transitions/fade';

export interface ReactWrapperSignature {
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

export default class ReactWrapperComponent extends Component<ReactWrapperSignature> {
  readonly transition = fade;

  @service declare store: Store;

  @tracked selected: (Node | Edge)[] = [];
  @tracked sidebarElement: HTMLElement | null = null;

  get canInsert() {
    return !!this.args.model;
  }

  get nodeActions() {
    return {
      save: this.save,
      create: this.create,
      delete: this.delete,
      select: this.select,
      unselect: this.unselect,
      onSidebarInserted: this.onSidebarInserted,
    };
  }

  get hasSelected() {
    return this.selected.length > 0;
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
  async didInsert(element: HTMLElement) {
    initReact(
      element,
      await this.args.model.nodes,
      await this.args.model.edges,
      this.nodeActions,
    );
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
    data.model = this.args.model;

    return this.store.createRecord<Node | Edge>(type, data).save();
  }

  @action
  async delete(type: 'node' | 'edge', id: string) {
    this.selected = this.selected.filter((r) => r.id !== id);
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

  @action onSidebarInserted(element: HTMLElement) {
    this.sidebarElement = element;
  }
}
