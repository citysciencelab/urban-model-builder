import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { action } from '@ember/object';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
export interface NodeFormFieldsParameterSettingsSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
    type: string;
    inputVisible: boolean;
    outputVisible: boolean;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsParameterSettingsComponent extends Component<NodeFormFieldsParameterSettingsSignature> {
  // FIXME: i18n
  parameterTypes = [
    { value: null, label: 'None' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'slider', label: 'Slider' },
    { value: 'select', label: 'Select' },
  ];

  get filteredParameterTypes() {
    if (this.args.type == 'boolean') {
      return this.parameterTypes.filter(
        (item) => item.value == 'boolean' || item.value == null,
      );
    } else {
      return this.parameterTypes;
    }
  }

  get selectedParameterType() {
    return this.parameterTypes.filter(
      (item) => item.value == this.args.changeset.dataProxy.parameterType,
    )[0];
  }

  @action onParameterTypeChange(parameterType: {
    value: string | null;
    label: string;
  }) {
    const newToggleValue = !this.args.changeset.dataProxy.isParameter;

    let yesNo = true;
    if (newToggleValue == true && this.args.changeset.dataProxy.data.value) {
      yesNo = confirm(
        'When you use this node as parameter the current value will not be used, proceed?',
      );
    }

    if (yesNo) {
      this.args.changeset.dataProxy.parameterType = parameterType.value;
      this.args.changeset.dataProxy.isParameter = !!parameterType.value;

      if (this.args.changeset.dataProxy.isParameter) {
        this.initValueByType();
      }
    }
  }

  initValueByType() {
    if (this.args.changeset.dataProxy.parameterType == 'boolean') {
      // set values to 0/1 respectively (true/false)
      this.args.changeset.dataProxy.parameterMin = 0;
      this.args.changeset.dataProxy.parameterMax = 1;
    } else if (this.args.changeset.dataProxy.parameterType == 'slider') {
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
    } else if (this.args.changeset.dataProxy.parameterType == 'select') {
      // init the data structure
      if (!this.args.changeset.dataProxy.parameterOptions) {
        this.args.changeset.dataProxy.parameterOptions = {
          data: [
            {
              value: 0,
              label: 'New',
            },
          ],
        };
      }
    }
  }

  @action sortSelectOptionsByValue() {
    this.args.changeset.dataProxy.parameterOptions.data.sort(
      (a: { value: number }, b: { value: number }) => a.value - b.value,
    );
  }

  @action removeParameterSelectOption(option: {
    value: number;
    label: string;
  }) {
    const index = this.args.changeset.dataProxy.parameterOptions.data.findIndex(
      (indexOption: { value: number; label: string }) =>
        indexOption.value === option.value,
    );
    if (index !== -1) {
      this.args.changeset.dataProxy.parameterOptions.data.splice(index, 1);
    }
  }

  @action addParameterSelectOption() {
    let nextValue = 0;
    if (!this.args.changeset.dataProxy.parameterOptions) {
      this.args.changeset.dataProxy.parameterOptions = {
        data: [],
      };
    } else {
      const currData = this.args.changeset.dataProxy.parameterOptions.data;
      const lastData = currData[currData.length - 1];
      const lastValue = lastData.value;
      nextValue = Number(lastValue) + 1;
    }
    this.args.changeset.dataProxy.parameterOptions.data.push({
      value: nextValue,
      label: `New Value`,
    });
  }
}
