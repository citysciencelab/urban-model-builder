import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

export interface SimulationResultRecord {
  id: string;
  modelsVersionsId: string;
  scenariosId: string | null;
  createdBy: string;
  name: string;
  description: string | null;
  metadata: {
    modelId: string;
    modelName: string;
    version: string;
    timeStart: number;
    timeLength: number;
    timeEnd: number;
    downloadTimestamp: string;
    scenarioName?: string;
  };
  scenario: Record<string, any>;
  results: {
    times: (string | number)[];
    nodes: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export default class ModelsVersionsSimulationResultsController extends Controller {
  @service declare feathers: FeathersService;

  declare model: ModelsVersion;

  @tracked simulationResults: SimulationResultRecord[] = [];
  @tracked isLoading = false;
  @tracked error: string | null = null;

  @action
  async loadSimulationResults(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const results = await this.feathers.app.service('simulation-results').find({
        query: {
          modelsVersionsId: this.model.id,
          $sort: { createdAt: -1 },
        },
      });

      this.simulationResults = results.data || results || [];
    } catch (e) {
      console.error('Failed to load simulation results:', e);
      this.error = 'Fehler beim Laden der Simulationsergebnisse';
    } finally {
      this.isLoading = false;
    }
  }

  @action
  async deleteSimulationResult(id: string): Promise<void> {
    try {
      await this.feathers.app.service('simulation-results').remove(id);
      this.simulationResults = this.simulationResults.filter((r) => r.id !== id);
    } catch (e) {
      console.error('Failed to delete simulation result:', e);
      this.error = 'Fehler beim Löschen des Simulationsergebnisses';
    }
  }
}
