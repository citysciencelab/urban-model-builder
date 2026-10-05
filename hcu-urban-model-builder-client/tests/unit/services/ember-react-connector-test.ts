import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import type ModelValidationService from 'hcu-urban-model-builder-client/services/model-validation';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type { SimulationModelData } from 'hcu-urban-model-builder-backend';

const nodeRecord = (id: string, name: string) => ({
  id,
  type: 1,
  name,
  description: '',
  data: { value: '1' },
  position: { x: 0, y: 0 },
  height: null,
  width: null,
  parent: null,
  ghostParent: null,
  isParameter: false,
  isOutputParameter: false,
});

const modelVersion = (id: string) =>
  ({
    id,
    timeStart: 2025,
    timeStep: 1,
    timeLength: 15,
    timeUnits: 'Years',
    algorithm: 'Euler',
    globals: '',
    nodes: Promise.resolve([
      nodeRecord('node-1', 'CO2 Kosten'),
      nodeRecord('node-2', 'CO2_Preis'),
    ]),
    edges: Promise.resolve([
      {
        id: 'edge-1',
        type: 0,
        source: { id: 'node-1' },
        target: { id: 'node-2' },
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        points: null,
      },
    ]),
  }) as unknown as ModelsVersion;

module('Unit | Service | ember-react-connector', function (hooks) {
  setupTest(hooks);

  let connector: EmberReactConnectorService;
  let validation: ModelValidationService;

  hooks.beforeEach(function () {
    connector = this.owner.lookup('service:ember-react-connector');
    validation = this.owner.lookup('service:model-validation');
  });

  test('validateModel checks a one-step snapshot off the main thread and keeps the errors', async function (assert) {
    const model = modelVersion('version-1');
    connector.currentModel = model;
    let request: { id: string; snapshot: SimulationModelData } | undefined;
    validation.validate = async (id, snapshot) => {
      request = { id, snapshot };
      return { 'node-2': 'The primitive [CO2_Preis] has an equation error.' };
    };

    const errors = await connector.validateModel();

    assert.deepEqual(errors, {
      'node-2': 'The primitive [CO2_Preis] has an equation error.',
    });
    assert.deepEqual(connector.validationErrors, errors);
    assert.strictEqual(request!.id, 'version-1');
    assert.strictEqual(
      (request!.snapshot.modelVersion as unknown as { timeLength: number })
        .timeLength,
      1,
    );
    assert.strictEqual(model.timeLength, 15, 'the model keeps its time length');
    const { nodes, edges } = request!.snapshot as unknown as {
      nodes: { id: string }[];
      edges: { sourceId: string }[];
    };
    assert.deepEqual(
      nodes.map((node) => node.id),
      ['node-1', 'node-2'],
    );
    assert.strictEqual(edges[0]!.sourceId, 'node-1');
  });

  test('a superseded check leaves the markers alone', async function (assert) {
    connector.currentModel = modelVersion('version-1');
    connector.validationErrors = { 'node-2': 'old error' };
    validation.validate = async () => null;

    assert.strictEqual(await connector.validateModel(), null);
    assert.deepEqual(connector.validationErrors, { 'node-2': 'old error' });
  });

  test('a check for a model that was closed meanwhile is ignored', async function (assert) {
    connector.currentModel = modelVersion('version-1');
    connector.validationErrors = {};
    validation.validate = async () => {
      connector.currentModel = modelVersion('version-2');
      return { 'node-2': 'equation error' };
    };

    assert.strictEqual(await connector.validateModel(), null);
    assert.deepEqual(connector.validationErrors, {});
  });
});
