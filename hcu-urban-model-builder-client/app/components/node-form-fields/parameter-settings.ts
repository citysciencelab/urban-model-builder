import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { action } from '@ember/object';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';

export interface NodeFormFieldsParameterSettingsSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
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
    this.args.changeset.dataProxy.isParameter =
      !this.args.changeset.dataProxy.isParameter;
    if (
      this.args.type == 'boolean' &&
      this.args.changeset.dataProxy.isParameter
    ) {
      this.args.changeset.dataProxy.parameterMin = 0;
      this.args.changeset.dataProxy.parameterMax = 1;
    }
  }
}
