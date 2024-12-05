import Component from '@glimmer/component';
import { unitsCollection } from 'hcu-urban-model-builder-client/config/units-collection';
import { action } from '@ember/object';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { tracked } from '@glimmer/tracking';
import { set } from '@ember/object';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

export interface NodeFormFieldsUnitsSelectionSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
    property: string;
    modelsVersion: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsUnitsSelectionComponent extends Component<NodeFormFieldsUnitsSelectionSignature> {
  @tracked showUnits = false;

  @tracked _units = unitsCollection;

  @action async setUnit(unit: string) {
    // check if this is a "add" action with a new custom unit
    const isAdd = unit.trim() == 'Add New';

    // if isAdd is true, prompt for new unit, add it to the model version
    if (isAdd) {
      const newUnit = prompt('Enter custom unit');
      if (newUnit) {
        this.args.modelsVersion.addCustomUnit(
          newUnit,
          Number(this.args.changeset.model.id),
        );
        unit = newUnit as string;
      }
    }

    // set it to the current node changeset
    set(this.args.changeset.dataProxy, this.args.property, unit);

    // potentially remove old custom unit references
    await this.args.modelsVersion.removeOldUnitReferences(
      unit,
      Number(this.args.changeset.model.id),
    );

    // check if this is a custom unit
    const isCustomUnit = this.args.modelsVersion.isCustomUnit(unit);

    // if this is a custom unit and not an "add" action, add the node to the model version
    if (isCustomUnit && !isAdd) {
      // add new unit to custom units
      await this.args.modelsVersion.addCustomUnitReference(
        unit,
        Number(this.args.changeset.model.id),
      );
    }

    this.toggleUnitsVisibility();
  }

  get units() {
    this.addCustomUnitsToSelect();
    return this._units;
  }

  addCustomUnitsToSelect() {
    if (this.args.modelsVersion.customUnits?.data) {
      if (this._units && this._units[1] && this._units[1]['Custom']) {
        const customUnits = this._units[1]['Custom'] as string[];
        // remove all but first element (Add New)
        customUnits.splice(1);
        for (const datum of Object.keys(
          this.args.modelsVersion.customUnits.data,
        )) {
          if (!customUnits.includes(datum)) {
            customUnits.push(datum);
          }
        }
      }
    }
  }

  @action toggleUnitsVisibility() {
    this.showUnits = !this.showUnits;
  }
}
