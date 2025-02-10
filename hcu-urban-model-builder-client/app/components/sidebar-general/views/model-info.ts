import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import type Scenario from 'hcu-urban-model-builder-client/models/scenario';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';

import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';

export interface SidebarGeneralViewsModelInfoSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralViewsModelInfoComponent extends Component<SidebarGeneralViewsModelInfoSignature> {
  @service declare eventBus: EventBus;

  @action updateBoolParameter(
    scenario: Scenario,
    boolScenarioValue: ScenariosValue,
  ) {
    boolScenarioValue.value = boolScenarioValue.value == 0 ? 1 : 0;
    this.eventBus.emit('scenario-value-changed', {
      scenario,
      boolScenarioValue,
    });
  }

  @action handleScenarioSliderValueChange(
    scenario: Scenario,
    scenarioValue: ScenariosValue,
  ) {
    this.eventBus.emit('scenario-value-changed', {
      scenario,
      scenarioValue,
    });
  }

  @action handleScenarioSelectValueChange(
    scenario: Scenario,
    scenarioValue: ScenariosValue,
    newValue: { value: number; label: string },
  ) {
    scenarioValue.value = newValue.value;
    this.eventBus.emit('scenario-value-changed', {
      scenario,
      scenarioValue,
    });
  }

  @action async saveDefaultScenario(
    defaultScenario: Scenario,
    saveAction: any,
  ) {
    const values = await defaultScenario.scenariosValues;
    await saveAction(async () => {
      for (const value of values) {
        await value.save();
      }
    });
  }
}
