import { cached } from '@ember-data/tracking';
import { action } from '@ember/object';
import Component from '@glimmer/component';
import { TrackedAsyncData } from 'ember-async-data';
import type Node from 'hcu-urban-model-builder-client/models/node';

export interface NodeFormFieldsConverterSignature {
  // The arguments accepted by the component
  Args: {
    node: Node;
    changeset: Node;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsConverterComponent extends Component<NodeFormFieldsConverterSignature> {
  readonly interpolationOptions = ['Linear', 'Discrete'];

  @cached
  get inputNode() {
    const fetchInputNode = async () => {
      const [inputEdge] = await this.args.node.targetEdgesWithGhosts;
      if (!inputEdge) {
        return null;
      }

      const node = (await inputEdge.source)!;

      if (node.isGhost) {
        return node.ghostParent;
      }

      return node;
    };

    return new TrackedAsyncData(fetchInputNode());
  }

  get inputName() {
    if (this.inputNode.isResolved && this.inputNode.value) {
      return this.inputNode.value.name;
    }
    if (this.inputNode.isPending) {
      return 'Loading...';
    }

    return 'Time';
  }

  @action addNewValue() {
    if (!this.args.changeset.data.values) {
      this.args.changeset.data.values = [{ x: 0, y: 0 }];
    } else {
      const len = this.args.changeset.data.values.length;
      this.args.changeset.data.values.push({
        x: len,
        y: len,
      });
    }
  }

  @action
  updateValue(index: number, key: 'x' | 'y', val: number | string) {
    this.args.changeset.data.values![index]![key] = Number(val);
  }

  @action
  removeValue(index: number) {
    this.args.changeset.data.values!.splice(index, 1);
  }
}
