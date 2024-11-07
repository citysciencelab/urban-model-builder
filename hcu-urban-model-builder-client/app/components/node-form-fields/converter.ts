import { cached } from '@ember-data/tracking';
import { action } from '@ember/object';
import Component from '@glimmer/component';
import { TrackedAsyncData } from 'ember-async-data';
import type Node from 'hcu-urban-model-builder-client/models/node';

export interface NodeFormFieldsConverterSignature {
  // The arguments accepted by the component
  Args: {
    node: Node;
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
      const inputEdges = await this.args.node.targetEdges;
      const ghostChildren = await this.args.node.ghostChildren;

      for (const ghostChild of ghostChildren) {
        const ghostChildEdges = await ghostChild.targetEdges;

        inputEdges.push(...ghostChildEdges);
      }

      const [inputEdge] = inputEdges;

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
    if (!this.args.node.data.values) {
      this.args.node.data.values = [{ x: 0, y: 0 }];
    } else {
      const len = this.args.node.data.values.length;
      this.args.node.data.values.push({ x: len, y: len });
    }

    this.args.node.data = { ...this.args.node.data };
  }

  @action updateValue(index: number, key: 'x' | 'y', val: number) {
    this.args.node.data.values![index]![key] = Number(val);
    this.args.node.data = { ...this.args.node.data };
  }
}
