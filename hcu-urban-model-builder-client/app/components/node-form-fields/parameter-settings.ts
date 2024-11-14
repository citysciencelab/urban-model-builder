import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { action } from '@ember/object';

export interface NodeFormFieldsParameterSettingsSignature {
  // The arguments accepted by the component
  Args: {
    changeset: Node;
    type: string;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsParameterSettingsComponent extends Component<NodeFormFieldsParameterSettingsSignature> {
  @action toggleParameter() {
    this.args.changeset.isParameter = !this.args.changeset.isParameter;
    if (this.args.type == 'boolean' && this.args.changeset.isParameter) {
      this.args.changeset.parameterMin = 0;
      this.args.changeset.parameterMax = 1;
    }
  }
}
