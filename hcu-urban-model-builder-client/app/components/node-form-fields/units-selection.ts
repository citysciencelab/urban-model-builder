import Component from '@glimmer/component';
import { unitsCollection } from 'hcu-urban-model-builder-client/config/units-collection';
import { action } from '@ember/object';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { tracked } from '@glimmer/tracking';
import { set, get } from '@ember/object';
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

  // FIXME: i18n
  @tracked _units = unitsCollection;
  @tracked _value = '';

  @action async setUnit(unit: string, isAdd: boolean) {
    // set it to the current node changeset
    set(this.args.changeset.dataProxy, this.args.property, unit);

    // potentially remove old custom unit references
    await this.args.modelsVersion.removeOldUnitReferences(
      unit,
      this.args.changeset.model.id!,
    );

    // check if this is a custom unit
    const isCustomUnit = this.args.modelsVersion.existsInCustomUnits(unit);

    // if this is a custom unit and not an "add" action, add the node to the model version
    if (isCustomUnit && !isAdd) {
      // add new unit to custom units
      await this.args.modelsVersion.addCustomUnitReference(
        unit,
        this.args.changeset.model.id!,
      );
    }

    this.showUnits = false;
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

  unitExists(unit: string) {
    const lowerCaseUnit = unit.toLowerCase();
    for (const category of this._units) {
      for (const key in category) {
        if (Array.isArray(category[key])) {
          if (
            category[key].some((u: string) => u.toLowerCase() === lowerCaseUnit)
          ) {
            return true;
          }
        } else if (typeof category[key] === 'object') {
          for (const subKey in category[key]) {
            if (
              category[key][subKey].some(
                (u: string) => u.toLowerCase() === lowerCaseUnit,
              )
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  @action didInsert() {
    this._value =
      (get(this.args.changeset.model, this.args.property) as string) || '';
  }

  @action onInputChange(newValue: string) {
    this._value = newValue;
  }

  @action onInputEnter(e: KeyboardEvent) {
    if (e.key == 'Enter') {
      if (this._value.includes('/')) {
        this._value = this._value.replace(/s?\/s?/g, ' per ');
      }

      const unit = this._value;
      const unitExists = this.unitExists(unit);
      const isCustomUnit = this.args.modelsVersion.existsInCustomUnits(unit);

      let isAdd = false;
      if (!unitExists && !isCustomUnit) {
        isAdd = true;
        this.args.modelsVersion.addCustomUnit(
          unit,
          this.args.changeset.model.id!,
        );
      }

      this.setUnit(unit, isAdd);
    }
  }

  @action onItemClick(unit: string) {
    // check if this is a "add" action with a new custom unit
    const isAdd = unit.trim() == 'Add New';

    // if isAdd is true, prompt for new unit, add it to the model version
    if (isAdd) {
      const newUnit = prompt('Enter custom unit');
      if (newUnit) {
        this.args.modelsVersion.addCustomUnit(
          newUnit,
          this.args.changeset.model.id!,
        );
        unit = newUnit as string;
      }
    }

    this._value = unit;
    this.setUnit(unit, true);
  }

  @action onClickOutside() {
    this.showUnits = false;
  }

  @action onInputFocus() {
    this.showUnits = true;
  }
}
