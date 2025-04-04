import Component from '@glimmer/component';
import { action } from '@ember/object';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';

export interface NodeFormFieldsValidationSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
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
      const constraints = this.args.changeset.dataProxy.data.constraints || {};
      constraints[field] = 0;
      this.args.changeset.dataProxy.data.constraints = constraints;
    } else {
      const constraints = this.args.changeset.dataProxy.data.constraints || {};
      constraints[field] = undefined;
      this.args.changeset.dataProxy.data.constraints = constraints;
    }
  }

  @action setConstraintValue(field: 'min' | 'max', value: number) {
    const constraints = this.args.changeset.dataProxy.data.constraints || {};
    constraints[field] = Number(value);
    this.args.changeset.dataProxy.data.constraints = constraints;
  }
}
