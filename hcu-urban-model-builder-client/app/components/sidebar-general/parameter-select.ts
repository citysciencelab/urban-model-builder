import Component from '@glimmer/component';
import type { ScenarioValues } from 'hcu-urban-model-builder-backend';

export interface SidebarGeneralParameterSelectSignature {
  // The arguments accepted by the component
  Args: {
    options: { value: number; label: string }[];
    scenarioValue: ScenarioValues;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralParameterSelectComponent extends Component<SidebarGeneralParameterSelectSignature> {
  get selected() {
    if (!this.args.options) return null;
    return this.args.options.find(
      (option: { value: number; label: string }) =>
        option.value === this.args.scenarioValue.value,
    );
  }
}
