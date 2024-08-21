import { initReact } from 'hcu-urban-model-builder-react-canvas/index.tsx';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { service } from '@ember/service';
import type Store from '@ember-data/store';

export interface ReactWrapperSignature {
  // The arguments accepted by the component
  Args: {
    nodes: Node[];
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

  get canInsert() {
    return !!this.args.nodes;
  }

  get nodeActions() {
    return {
      save: this.saveNode,
      create: this.createNode,
      delete: this.deleteNode,
    };
  }

  @action
  didInsert(element: HTMLElement) {
    console.log('ReactWrapperComponent.didInsert', this.args.nodes);

    initReact(element, this.args.nodes, this.nodeActions);
  }

  @action
  async saveNode(id: string, data: any) {
    const record = this.store.peekRecord<Node>('node', id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    Object.assign(record, data);
    await record.save();
  }

  @action
  async createNode(data: any) {
    return this.store.createRecord<Node>('node', data).save();
  }

  @action
  async deleteNode(id: string) {
    const record = this.store.peekRecord<Node>('node', id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    record.deleteRecord();
    await record.save();
  }
}
