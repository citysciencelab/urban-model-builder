import Component from '@glimmer/component';
import { unitsCollection } from 'hcu-urban-model-builder-client/config/units-collection';
import { action } from '@ember/object';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { tracked } from '@glimmer/tracking';

export interface NodeFormFieldsUnitsSelectionSignature {
  // The arguments accepted by the component
  Args: {
    changeset: Node;
    property: string;
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
    const path: string[] = this.args.property.split('.');
    if (path && Array.isArray(path) && path.length == 2) {
      (this.args.changeset as any)[path[0] as string][path[1] as string] = unit;
    } else {
      throw Error('Invalid property path');
    }

    (this.args.changeset.data as any)[this.args.property] = unit;
    this.toggleUnitsVisibility();
  }

  @action toggleUnitsVisibility() {
    this.showUnits = !this.showUnits;
  }
}
