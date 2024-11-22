import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { action } from '@ember/object';
import { next } from '@ember/runloop';
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
  @action toggleParameter(event: Event) {
    const newToggleValue = !this.args.changeset.dataProxy.isParameter;

    let yesNo = true;
    if (newToggleValue == true && this.args.changeset.dataProxy.data.value) {
      yesNo = confirm(
        'When you use this node as parameter the current value will not be used, proceed?',
      );
    }

    if (!yesNo) {
      // hack to reset the toggle parameter value
      this.args.changeset.dataProxy.isParameter = true;
      next(() => {
        this.args.changeset.dataProxy.isParameter = false;
      });
      return false;
    }

    this.args.changeset.dataProxy.isParameter = newToggleValue;

    if (
      this.args.type == 'boolean' &&
      this.args.changeset.dataProxy.isParameter
    ) {
      // set values to 0/1 respectively (true/false)
      this.args.changeset.dataProxy.parameterMin = 0;
      this.args.changeset.dataProxy.parameterMax = 1;
    } else if (
      this.args.type != 'boolean' &&
      this.args.changeset.dataProxy.isParameter
    ) {
      // potentialy initialize the min and max values
      if (!this.args.changeset.dataProxy.parameterMin) {
        this.args.changeset.dataProxy.parameterMin = 0;
      }
      if (!this.args.changeset.dataProxy.parameterMax) {
        this.args.changeset.dataProxy.parameterMax = 1;
      }
      if (!this.args.changeset.dataProxy.parameterStep) {
        this.args.changeset.dataProxy.parameterStep = 0.1;
      }
    }
  }
}
