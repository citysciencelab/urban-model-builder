import Component from '@glimmer/component';
import { unitsCollection } from 'hcu-urban-model-builder-client/config/units-collection';
import { action } from '@ember/object';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { tracked } from '@glimmer/tracking';

export interface NodeFormFieldsUnitsSelectionSignature {
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

export default class NodeFormFieldsUnitsSelectionComponent extends Component<NodeFormFieldsUnitsSelectionSignature> {
  units = unitsCollection;

  @tracked showUnits = false;

  @action setUnit(unit: string) {
    this.args.node.data = {
      ...this.args.node.data,
      units: unit,
    };
    this.toggleUnitsVisibility();
  }

  @action toggleUnitsVisibility() {
    this.showUnits = !this.showUnits;
  }
}
