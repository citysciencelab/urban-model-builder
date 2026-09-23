import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

export default class ModelsVersionsSimulationResultsController extends Controller {
  declare model: ModelsVersion;

  // bumped by the "Aktualisieren" button, the SimulationViewer reloads when it changes
  @tracked reloadKey = 0;

  @action
  loadSimulationResults(): void {
    this.reloadKey++;
  }
}
