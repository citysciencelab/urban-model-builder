import Component from '@glimmer/component';
import { action } from '@ember/object';
import type Scenario from 'hcu-urban-model-builder-client/models/scenario';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';
import { service } from '@ember/service';
import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';
import { tracked } from '@glimmer/tracking';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import { load } from 'ember-async-data';
import type Store from '@ember-data/store';
import { ensureSafeComponent } from '@embroider/util';
import { importSync } from '@embroider/macros';
import { dasherize } from '@ember/string';

export interface SidebarGeneralSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralComponent extends Component<SidebarGeneralSignature> {
  @service declare eventBus: EventBus;
  @service() declare storeEventEmitter: StoreEventEmitterService;
  @service declare store: Store;

  @tracked defaultScenario: Scenario | null = null;
  @tracked isMinimized = false;
  @tracked activeView = 'modelInfo';

  get sidebarViewComponent() {
    if (!this.activeView) {
      return null;
    }
    try {
      const fileName = dasherize(this.activeView);
      const module = importSync(`./sidebar-general/views/${fileName}`) as any;

      return ensureSafeComponent(module.default, this);
    } catch (e) {
      console.debug(e);
      return null;
    }
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
    this.loadDefaultScenario(this.args.model);
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

  @action minimize() {
    this.isMinimized = !this.isMinimized;
  }

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
}
