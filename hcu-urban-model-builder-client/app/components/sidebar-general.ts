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

  @action scenarioValuesServiceChangeListener(data: any) {
    console.log('-> deleted');
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
    console.log('remove');
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

  @action handleScenarioValueChange(
    scenario: Scenario,
    scenarioValue: ScenariosValue,
  ) {
    // TODO: retrigger simulation if open
    console.log('change');
    this.eventBus.emit('scenario-value-changed', {
      scenario,
      scenarioValue,
    });
  }
}
