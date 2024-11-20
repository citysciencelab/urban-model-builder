import Component from '@glimmer/component';
import { unitsCollection } from 'hcu-urban-model-builder-client/config/units-collection';
import { action } from '@ember/object';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { tracked } from '@glimmer/tracking';
import { set } from '@ember/object';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';

export interface NodeFormFieldsUnitsSelectionSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
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
    set(this.args.changeset.dataProxy, this.args.property, unit);
    this.toggleUnitsVisibility();
  }

  @action toggleUnitsVisibility() {
    this.showUnits = !this.showUnits;
  }
}
