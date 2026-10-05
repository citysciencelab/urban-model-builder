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
  @tracked scenarioValues: ScenariosValue[] = [];
  @tracked namedScenarios: Scenario[] = [];
  @tracked selectedScenario: Scenario | null = null;
  @tracked scenarioName = '';
  @tracked isSavingScenario = false;
  @tracked scenarioSaveError = false;
  @tracked showResetConfirmModal = false;
  @tracked showDeleteConfirmModal = false;
  @tracked isDeletingScenario = false;
  @tracked scenarioDeleteError = false;
  // Named scenario id -> (node id -> value), used to recognise when the
  // working values match a preset.
  @tracked presetValues = new Map<string, Map<string, number>>();

  get canDeleteSelectedScenario() {
    return !!this.activeScenario && !this.activeScenario.isDefault;
  }

  // The scenario whose values equal the working values. The explicitly
  // selected one wins if several presets hold the same values.
  get matchingScenario(): Scenario | null {
    if (!this.defaultScenario) return null;
    const candidates = new Set(
      [
        this.selectedScenario,
        this.defaultScenario,
        ...this.namedScenarios,
      ].filter((scenario): scenario is Scenario => !!scenario),
    );
    for (const scenario of candidates) {
      if (this.matchesScenario(scenario)) return scenario;
    }
    return null;
  }

  // While the values match no scenario, the dropdown keeps showing the one
  // they were last derived from.
  get activeScenario() {
    return this.matchingScenario ?? this.selectedScenario;
  }

  get hasScenarioChanges() {
    return !!this.defaultScenario && !this.matchingScenario;
  }

  get selectedScenarioId() {
    return this.activeScenario?.id ?? this.defaultScenario?.id ?? '';
  }

  matchesScenario(scenario: Scenario) {
    if (scenario === this.defaultScenario) {
      return !this.scenarioValues.some((value) =>
        this.isChangedFromDefault(value),
      );
    }
    const preset = this.presetValues.get(scenario.id);
    if (!preset) return false;
    // Applying a preset resets the parameters it doesn't cover to their
    // defaults, so those have to be at their default to match.
    return this.scenarioValues.every(
      (value) =>
        Number(value.value) ===
        (preset.get(this.nodeIdOf(value)) ?? this.defaultValueOf(value)),
    );
  }

  // The working values are the default scenario's own records, so their
  // persisted state is the default. Moving a slider away and back leaves the
  // record dirty but unchanged, hence the value comparison.
  @action isChangedFromDefault(scenarioValue: ScenariosValue) {
    return Number(scenarioValue.value) !== this.defaultValueOf(scenarioValue);
  }

  defaultValueOf(scenarioValue: ScenariosValue) {
    if (!scenarioValue.hasDirtyAttributes) return Number(scenarioValue.value);
    const change = scenarioValue.changedAttributes()['value'];
    return Number(change ? change[0] : scenarioValue.value);
  }

  nodeIdOf(scenarioValue: ScenariosValue) {
    return scenarioValue.belongsTo('nodes').id() ?? '';
  }

  // Called after every manual change: once the values match a scenario, it
  // becomes the selection the dropdown falls back to.
  syncSelectedScenario() {
    this.selectedScenario = this.matchingScenario ?? this.selectedScenario;
  }

  async loadPresetValues(scenarios: Scenario[]) {
    const entries = await Promise.all(
      scenarios.map(async (scenario) => {
        const values = await scenario.scenariosValues;
        const byNode = new Map(
          values.map((value) => [this.nodeIdOf(value), Number(value.value)]),
        );
        return [scenario.id, byNode] as const;
      }),
    );
    this.presetValues = new Map(entries);
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
    this.syncSelectedScenario();
  }

  @action handleScenarioSliderValueChange(
    scenario: Scenario,
    scenarioValue: ScenariosValue,
  ) {
    this.eventBus.emit('scenario-value-changed', {
      scenario,
      scenarioValue,
    });
    this.syncSelectedScenario();
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
    this.syncSelectedScenario();
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
      this.scenarioValues = [];
      return;
    }
    this.defaultScenario = defaultScenarios[0] as Scenario;
    this.scenarioValues = [...(await this.defaultScenario.scenariosValues)];
    this.selectedScenario ??= this.defaultScenario;

    try {
      const namedScenarios = (await this.store.query('scenario', {
        modelsVersionsId: modelsVersion.id,
        isDefault: false,
      })) as Scenario[];
      this.namedScenarios = namedScenarios.filter(
        (scenario) => !scenario.isDefault,
      );
      await this.loadPresetValues(this.namedScenarios);
    } catch {
      // Named presets are optional; a failed preset request must never hide
      // the model's editable default parameters.
      this.namedScenarios = [];
    }
  }

  @action updateScenarioName(event: Event) {
    this.scenarioName = (event.target as HTMLInputElement).value;
  }

  @action async selectScenario(event: Event) {
    if (!this.defaultScenario) return;
    const id = (event.target as HTMLSelectElement).value;
    const scenario = [this.defaultScenario, ...this.namedScenarios].find(
      (candidate) => candidate.id === id,
    );
    if (!scenario) return;

    if (scenario === this.defaultScenario) {
      this.resetToDefaults();
      return;
    }

    // Start from the defaults so parameters the preset doesn't cover don't
    // keep values from the previously selected scenario.
    const targetValues = await scenario.scenariosValues;
    const valuesByNode = new Map(
      targetValues.map((value) => [this.nodeIdOf(value), Number(value.value)]),
    );
    this.presetValues = new Map(this.presetValues).set(
      scenario.id,
      valuesByNode,
    );
    for (const workingValue of this.scenarioValues) {
      const value = valuesByNode.get(this.nodeIdOf(workingValue));
      if (value === undefined) {
        if (!workingValue.hasDirtyAttributes) continue;
        workingValue.rollbackAttributes();
      } else {
        workingValue.value = value;
      }
      this.emitScenarioValueChanged(workingValue);
    }
    this.selectedScenario = scenario;
  }

  @action resetToDefaults() {
    for (const workingValue of this.scenarioValues) {
      if (!workingValue.hasDirtyAttributes) continue;
      workingValue.rollbackAttributes();
      this.emitScenarioValueChanged(workingValue);
    }
    this.selectedScenario = this.defaultScenario;
    this.scenarioName = '';
    this.scenarioSaveError = false;
  }

  @action openResetConfirm() {
    this.showResetConfirmModal = true;
  }

  @action cancelReset() {
    this.showResetConfirmModal = false;
  }

  @action confirmReset() {
    this.showResetConfirmModal = false;
    this.resetToDefaults();
  }

  @action openDeleteConfirm() {
    this.scenarioDeleteError = false;
    this.showDeleteConfirmModal = true;
  }

  @action cancelDelete() {
    if (this.isDeletingScenario) return;
    this.showDeleteConfirmModal = false;
  }

  // Deleting removes the preset's values via the database cascade. The
  // dropdown falls back to the defaults, so the working values follow.
  @action async confirmDelete() {
    const scenario = this.activeScenario;
    if (!scenario || scenario.isDefault || this.isDeletingScenario) return;
    this.isDeletingScenario = true;
    this.scenarioDeleteError = false;
    try {
      const scenarioId = scenario.id;
      await scenario.destroyRecord();
      this.namedScenarios = this.namedScenarios.filter(
        (item) => item !== scenario,
      );
      const presetValues = new Map(this.presetValues);
      presetValues.delete(scenarioId);
      this.presetValues = presetValues;
      this.showDeleteConfirmModal = false;
      this.resetToDefaults();
    } catch (error) {
      console.error('Deleting the named scenario failed', error);
      scenario.rollbackAttributes();
      this.scenarioDeleteError = true;
    } finally {
      this.isDeletingScenario = false;
    }
  }

  emitScenarioValueChanged(scenarioValue: ScenariosValue) {
    this.eventBus.emit('scenario-value-changed', {
      scenario: this.defaultScenario,
      scenarioValue,
    });
  }

  @action async saveNamedScenario() {
    const name = this.scenarioName.trim();
    if (!name || !this.defaultScenario || this.isSavingScenario) return;
    this.isSavingScenario = true;
    this.scenarioSaveError = false;
    let scenario: Scenario | null = null;
    try {
      scenario = this.store.createRecord('scenario', {
        name,
        isDefault: false,
        modelsVersions: this.args.modelVersion,
      }) as Scenario;
      await scenario.save();
      const savedValues = new Map<string, number>();
      for (const source of this.scenarioValues) {
        // `nodes` is an async belongsTo; createRecord needs the record itself,
        // not the promise proxy the getter returns.
        const node = await source.nodes;
        const value = this.store.createRecord('scenarios-value', {
          value: Number(source.value),
          nodes: node,
          scenarios: scenario,
        }) as ScenariosValue;
        await value.save();
        savedValues.set(this.nodeIdOf(source), Number(source.value));
      }
      this.presetValues = new Map(this.presetValues).set(
        scenario.id,
        savedValues,
      );
      this.namedScenarios = [
        ...this.namedScenarios.filter((item) => item.id !== scenario?.id),
        scenario,
      ];
      this.selectedScenario = scenario;
      this.scenarioName = '';
    } catch (error) {
      console.error('Saving the named scenario failed', error);
      this.scenarioSaveError = true;
      if (scenario?.isNew) {
        scenario.unloadRecord();
      } else if (scenario) {
        await scenario.destroyRecord();
      }
    } finally {
      this.isSavingScenario = false;
    }
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
