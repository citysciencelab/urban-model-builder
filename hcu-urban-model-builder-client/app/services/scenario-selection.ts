import Service from '@ember/service';

export type ActivePreset = { id: string; name: string };

/**
 * Which named scenario (preset) the working parameter values currently equal,
 * per model version. The scenario panel is the only place that decides this;
 * it publishes the outcome here so the simulation can record it when it
 * starts. `null` means the values match no preset (default settings or own
 * changes).
 */
export default class ScenarioSelectionService extends Service {
  private activePresets = new Map<string, ActivePreset | null>();

  setActivePreset(modelVersionId: string, preset: ActivePreset | null) {
    this.activePresets.set(modelVersionId, preset);
  }

  activePresetFor(modelVersionId: string): ActivePreset | null {
    return this.activePresets.get(modelVersionId) ?? null;
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:scenario-selection')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('scenario-selection') declare altName: ScenarioSelectionService;`.
declare module '@ember/service' {
  interface Registry {
    'scenario-selection': ScenarioSelectionService;
  }
}
