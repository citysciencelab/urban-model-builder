import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { createValidationSnapshot } from 'hcu-urban-model-builder-client/utils/validation-snapshot';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type {
  Edges,
  Nodes,
  SimulationModelData,
} from 'hcu-urban-model-builder-backend';

const nodes = [
  {
    id: 'node-1',
    name: 'CO2_Preis',
    type: 1,
    data: { value: '[CO2 Kosten] * 1000' },
  },
] as unknown as Nodes[];
const edges = [
  { id: 'edge-1', sourceId: 'node-0', targetId: 'node-1' },
] as unknown as Edges[];

// The backend's `ModelsVersions` type is loose on the client side.
const settings = (snapshot: SimulationModelData) =>
  snapshot.modelVersion as unknown as {
    timeStart: number;
    timeStep: number;
    timeLength: number;
    timeUnits: string;
  };
const formula = (node: Nodes) =>
  (node as unknown as { data: { value: string } }).data.value;

module('Unit | Utility | validation-snapshot', function (hooks) {
  setupTest(hooks);

  test('simulates a single time step and leaves the store untouched', function (assert) {
    const store = this.owner.lookup('service:store');
    const modelVersion = store.push({
      data: {
        id: 'version-1',
        type: 'models-version',
        attributes: {
          timeStart: 2025,
          timeStep: 1,
          timeLength: 15,
          timeUnits: 'Years',
          algorithm: 'Euler',
          globals: '',
        },
      },
    }) as ModelsVersion;

    const snapshot = createValidationSnapshot(modelVersion, nodes, edges);

    assert.strictEqual(settings(snapshot).timeLength, 1, 'one step');
    assert.strictEqual(settings(snapshot).timeStart, 2025);
    assert.strictEqual(settings(snapshot).timeStep, 1);
    assert.strictEqual(settings(snapshot).timeUnits, 'Years');
    assert.strictEqual(
      modelVersion.timeLength,
      15,
      'the record keeps its time length',
    );
    assert.false(modelVersion.hasDirtyAttributes, 'the record is not changed');
  });

  test('a step shorter than a year stays one step', function (assert) {
    const snapshot = createValidationSnapshot(
      { id: 'version-1', timeStart: 0, timeStep: 0.25, timeLength: 10 },
      nodes,
      edges,
    );

    assert.strictEqual(settings(snapshot).timeLength, 0.25);
  });

  test('the snapshot is detached from the nodes and edges it was built from', function (assert) {
    const snapshot = createValidationSnapshot(
      { id: 'version-1', timeStart: 2025, timeStep: 1, timeLength: 15 },
      nodes,
      edges,
    );

    (snapshot.nodes[0] as unknown as { data: { value: string } }).data.value =
      'changed';

    assert.deepEqual(snapshot.edges, edges);
    assert.strictEqual(formula(nodes[0]!), '[CO2 Kosten] * 1000');
  });
});
