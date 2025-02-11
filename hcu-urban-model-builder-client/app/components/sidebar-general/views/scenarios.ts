import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';

import type Scenario from 'hcu-urban-model-builder-client/models/scenario';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';
import type Store from '@ember-data/store';
import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';
import { tracked } from '@glimmer/tracking';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

export interface SidebarGeneralViewsScenariosSignature {
  // The arguments accepted by the component
  Args: {
    modelVersion: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralViewsScenariosComponent extends Component<SidebarGeneralViewsScenariosSignature> {
  @service declare eventBus: EventBus;
  @service() declare storeEventEmitter: StoreEventEmitterService;
  @service declare store: Store;

  @tracked defaultScenario: Scenario | null = null;

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

  @action async loadDefaultScenario(modelsVersion: ModelsVersion) {
    const defaultScenarios = (await this.store.query('scenario', {
      modelsVersionsId: modelsVersion.id,
      isDefault: true,
    })) as Scenario[];
    if (defaultScenarios.length === 0) {
      this.defaultScenario = null;
    }
    this.defaultScenario = defaultScenarios[0] as Scenario;
  }

  @action scenarioValuesServiceChangeListener() {
    this.loadDefaultScenario(this.args.modelVersion);
  }

  @action addEventListeners() {
    this.storeEventEmitter.on(
      'node',
      'deleted',
      this.scenarioValuesServiceChangeListener,
    );
    this.storeEventEmitter.on(
      'scenarios-value',
      'deleted',
      this.scenarioValuesServiceChangeListener,
    );
    this.storeEventEmitter.on(
      'scenarios-value',
      'created',
      this.scenarioValuesServiceChangeListener,
    );
  }

  @action removeEventListeners() {
    this.storeEventEmitter.off(
      'node',
      'deleted',
      this.scenarioValuesServiceChangeListener,
    );
    this.storeEventEmitter.off(
      'scenarios-value',
      'deleted',
      this.scenarioValuesServiceChangeListener,
    );
    this.storeEventEmitter.off(
      'scenarios-value',
      'created',
      this.scenarioValuesServiceChangeListener,
    );
  }
}
