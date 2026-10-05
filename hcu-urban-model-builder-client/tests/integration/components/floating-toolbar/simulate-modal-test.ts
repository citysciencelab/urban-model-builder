import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, find, render, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import Service from '@ember/service';
import type Store from '@ember-data/store';
import type { TestContext } from '@ember/test-helpers';
import SimulateModal from 'hcu-urban-model-builder-client/components/floating-toolbar/simulate-modal';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type Edge from 'hcu-urban-model-builder-client/models/edge';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';
import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';
import { StoreEventSenderTransport } from 'hcu-urban-model-builder-client/services/store-event-emitter';

type Scenario = Record<string, number>;

// The simulation task waits 250 ms before it runs; anything that would start a
// run has done so well within this time.
const QUIET_MS = 600;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class FeathersStub extends Service {
  saved: unknown[] = [];
  app = {
    service: () => ({
      findSimulationResults: async () => ({
        data: [],
        total: this.saved.length,
      }),
      saveSimulationResult: async (data: unknown) => {
        this.saved.push(data);
        return data;
      },
    }),
  };
}

class EmberReactConnectorStub extends Service {
  select() {}
}

type PanelPrototype = {
  runSimulationBatch: (
    runCount: number,
    scenario: Scenario,
  ) => Promise<unknown>;
  startAnimation: () => void;
};

interface Context extends TestContext {
  model: ModelsVersion;
  store: Store;
  feathers: FeathersStub;
}

module(
  'Integration | Component | floating-toolbar/simulate-modal',
  function (hooks) {
    setupRenderingTest(hooks);
    setupIntl(hooks, 'de-de');

    // Each entry is one simulation run, recorded with the scenario it got.
    let runs: Scenario[] = [];
    const prototype = SimulateModal.prototype as unknown as PanelPrototype;
    const { runSimulationBatch, startAnimation } = prototype;

    hooks.beforeEach(function (this: Context) {
      runs = [];
      // No worker and no real simulation: the batch returns an empty result at
      // once. The chart animation is skipped so no frame callback outlives a test.
      prototype.runSimulationBatch = async (_runCount, scenario) => {
        runs.push(scenario);
        return [{ nodes: {}, times: [2025, 2026] }];
      };
      prototype.startAnimation = () => {};

      this.owner.register('service:feathers', FeathersStub);
      this.owner.register(
        'service:ember-react-connector',
        EmberReactConnectorStub,
      );
      this.feathers = this.owner.lookup(
        'service:feathers',
      ) as unknown as FeathersStub;
      this.store = this.owner.lookup('service:store') as Store;

      this.store.push({
        data: [
          {
            type: 'models-version',
            id: 'version',
            attributes: {
              timeStart: 2025,
              timeLength: 15,
              timeStep: 1,
              autoSimulate: false,
            },
            relationships: {
              nodes: {
                data: [
                  { type: 'node', id: 'slider' },
                  { type: 'node', id: 'output' },
                ],
              },
              edges: { data: [] },
              scenarios: { data: [{ type: 'scenario', id: 'default' }] },
            },
          },
          {
            type: 'node',
            id: 'slider',
            attributes: { name: 'Regler', isParameter: true },
          },
          {
            type: 'node',
            id: 'output',
            attributes: { name: 'Ergebnis', isOutputParameter: true },
          },
          {
            type: 'scenario',
            id: 'default',
            attributes: { name: 'Standard', isDefault: true },
            relationships: {
              modelsVersions: {
                data: { type: 'models-version', id: 'version' },
              },
              scenariosValues: {
                data: [{ type: 'scenarios-value', id: 'slider-value' }],
              },
            },
          },
          {
            type: 'scenarios-value',
            id: 'slider-value',
            attributes: { value: 10 },
            relationships: {
              nodes: { data: { type: 'node', id: 'slider' } },
              scenarios: { data: { type: 'scenario', id: 'default' } },
            },
          },
        ],
      });
      this.model = this.store.peekRecord(
        'models-version',
        'version',
      ) as ModelsVersion;
    });

    hooks.afterEach(function () {
      prototype.runSimulationBatch = runSimulationBatch;
      prototype.startAnimation = startAnimation;
    });

    const renderPanel = async () => {
      await render(
        hbs`<FloatingToolbar::SimulateModal @model={{this.model}} />`,
      );
    };

    const clickSimulate = () => click('.ember-basic-dropdown-trigger button');
    const clickPin = () => click('.simulate-card__row button');

    const runsFinished = async (count: number) => {
      await waitUntil(
        () => runs.length === count && !find('.simulate-model__chart-loading'),
        { timeout: 5000 },
      );
      await settled();
    };

    const nothingStarts = async () => {
      await wait(QUIET_MS);
      await settled();
    };

    const setSliderValue = (context: Context, value: number) => {
      const scenarioValue = context.store.peekRecord(
        'scenarios-value',
        'slider-value',
      ) as ScenariosValue;
      // Changed in the store only, as the scenario panel does before
      // "Für alle speichern".
      scenarioValue.value = value;
    };

    const changeModel = (context: Context) => {
      const eventBus = context.owner.lookup('service:event-bus') as EventBus;
      const storeEventEmitter = context.owner.lookup(
        'service:store-event-emitter',
      ) as StoreEventEmitterService;
      const node = context.store.peekRecord('node', 'slider') as Node;
      const edge = context.store.createRecord('edge', {}) as Edge;

      eventBus.emit('scenario-value-changed', {});
      storeEventEmitter.emit(
        'node',
        'updated',
        node,
        StoreEventSenderTransport.LOCAL,
      );
      storeEventEmitter.emit(
        'edge',
        'created',
        edge,
        StoreEventSenderTransport.LOCAL,
      );
    };

    test('without automatic simulation, changes start no run', async function (this: Context, assert) {
      await renderPanel();
      await clickSimulate();
      await runsFinished(1);
      await clickPin();

      changeModel(this);
      await nothingStarts();

      assert.strictEqual(runs.length, 1, 'only the run from opening the panel');
      assert.strictEqual(
        this.feathers.saved.length,
        1,
        'no further result saved',
      );
    });

    test('with automatic simulation, quick changes start exactly one run', async function (this: Context, assert) {
      this.model.autoSimulate = true;
      await renderPanel();
      await clickSimulate();
      await runsFinished(1);
      await clickPin();

      changeModel(this);
      await runsFinished(2);
      await nothingStarts();

      assert.strictEqual(runs.length, 2);
      assert.strictEqual(this.feathers.saved.length, 2);
    });

    for (const autoSimulate of [false, true]) {
      test(`"Simulieren" runs with the unsaved scenario values (automatic simulation ${autoSimulate ? 'on' : 'off'})`, async function (this: Context, assert) {
        this.model.autoSimulate = autoSimulate;
        setSliderValue(this, 42);
        await renderPanel();

        await clickSimulate();
        await runsFinished(1);

        assert.deepEqual(runs, [{ slider: 42 }]);
        assert.strictEqual(this.feathers.saved.length, 1);
      });
    }

    test('"Simulieren" starts a new run while the panel is pinned', async function (this: Context, assert) {
      await renderPanel();
      await clickSimulate();
      await runsFinished(1);
      await clickPin();

      setSliderValue(this, 7);
      await clickSimulate();
      await runsFinished(2);

      assert.deepEqual(runs, [{ slider: 10 }, { slider: 7 }]);
      assert.strictEqual(this.feathers.saved.length, 2);
      assert.dom('.simulate-card').exists('the panel stays open');
      assert.dom('.simulate-card__row button').hasClass('pinned', 'and pinned');
    });

    test('"Simulieren" closes an open panel that is not pinned', async function (this: Context, assert) {
      await renderPanel();
      await clickSimulate();
      await runsFinished(1);

      await clickSimulate();
      await nothingStarts();

      assert.dom('.simulate-card').doesNotExist();
      assert.strictEqual(runs.length, 1);
    });

    test('switching the chart tab starts no run', async function (this: Context, assert) {
      await renderPanel();
      await clickSimulate();
      await runsFinished(1);

      await click('.simulate-card .nav-link');
      await nothingStarts();

      assert.strictEqual(runs.length, 1);
      assert.strictEqual(this.feathers.saved.length, 1);
      assert.dom('.simulate-card .nav-link.active').exists();
    });
  },
);
