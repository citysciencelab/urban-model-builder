import type {
  Edges,
  Nodes,
  SimulationModelData,
} from 'hcu-urban-model-builder-backend';

// The time settings of a model version, as held by its Ember record.
export type ValidationModelVersion = {
  id: string | null;
  timeUnits?: string | null;
  timeStart?: number | null;
  timeStep?: number | null;
  timeLength?: number | null;
  algorithm?: string | null;
  globals?: string | null;
};

/**
 * Builds the plain, cloneable graph the model-validation worker simulates.
 *
 * The check only needs to know whether SimulationJS can build and start the
 * model, so it simulates a single time step: `timeLength` becomes `timeStep`.
 * Runtime errors that only occur in later years are not found this way; the
 * full simulation still reports those. The JSON round trip detaches the
 * snapshot from Ember's records (they cannot be structured-cloned into a
 * worker) and leaves the store untouched.
 */
export function createValidationSnapshot(
  modelVersion: ValidationModelVersion,
  nodes: Nodes[],
  edges: Edges[],
): SimulationModelData {
  const timeStep = modelVersion.timeStep || 1;

  return JSON.parse(
    JSON.stringify({
      modelVersion: {
        id: modelVersion.id,
        timeUnits: modelVersion.timeUnits,
        timeStart: modelVersion.timeStart,
        timeStep: modelVersion.timeStep,
        timeLength: timeStep,
        algorithm: modelVersion.algorithm,
        globals: modelVersion.globals,
      },
      nodes,
      edges,
    }),
  ) as SimulationModelData;
}
