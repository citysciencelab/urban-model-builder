import Component from '@glimmer/component';
import { action } from '@ember/object';
import type Node from 'hcu-urban-model-builder-client/models/node';

export interface NodeFormFieldsValidationSignature {
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

export default class NodeFormFieldsValidationComponent extends Component<NodeFormFieldsValidationSignature> {
  @action handleConstraintChange(field: 'min' | 'max', state: boolean) {
    if (state == true) {
      const contraints = this.args.node.data.constraints || {};
      contraints[field] = 0;
      this.args.node.data = { ...this.args.node.data, constraints: contraints };
    } else {
      const contraints = this.args.node.data.constraints || {};
      contraints[field] = undefined;
      this.args.node.data = { ...this.args.node.data, constraints: contraints };
    }
  }
}
