import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import {
  click,
  fillIn,
  render,
  settled,
  triggerKeyEvent,
  waitUntil,
  type TestContext,
} from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import Service from '@ember/service';
import { MemoryService } from '@feathersjs/memory';
import { NodeType } from 'hcu-urban-model-builder-backend';

const KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef';

/** A model version for simulations in the browser: one variable, one stock with an inflow. */
const VERSION = {
  id: 'version-1',
  timeUnits: 'Years',
  timeStart: 0,
  timeLength: 10,
  timeStep: 1,
  algorithm: 'Euler',
  globals: '',
};
const node = (id: string, type: NodeType, name: string, data: object) => ({
  id,
  type,
  name,
  data,
  modelsVersionsId: VERSION.id,
  parentId: null,
  ghostParentId: null,
  isParameter: false,
  isOutputParameter: true,
  position: { x: 0, y: 0 },
});
const NODES = [
  node('rate', NodeType.Variable, 'Rate', { value: '5' }),
  node('trees', NodeType.Stock, 'Trees', { value: '100' }),
  node('planting', NodeType.Flow, 'Planting', { rate: '[Rate]' }),
];
const EDGES = [
  {
    id: 'e1',
    type: 0,
    sourceId: 'rate',
    targetId: 'planting',
    sourceHandle: 'source-right',
    targetHandle: 'target-0',
    modelsVersionsId: VERSION.id,
  },
  {
    id: 'e2',
    type: 1,
    sourceId: 'planting',
    targetId: 'trees',
    sourceHandle: 'flow-source',
    targetHandle: 'target-left',
    modelsVersionsId: VERSION.id,
  },
];
const memory = (records: { id: string }[]) =>
  new MemoryService({
    id: 'id',
    store: Object.fromEntries(records.map((record) => [record.id, record])),
    paginate: { default: 1000, max: 1000 },
  });
const SETTINGS = {
  chatAvailable: true,
  hasOpenRouterKey: true,
  openRouterKeyHint: '…cdef',
  model: null,
  defaultModel: 'vendor/model-a',
  availableModels: ['vendor/model-a', 'vendor/model-b'],
};

type Listener = (event: Record<string, unknown>) => void;
type ChatRequest = { requestId: string; [key: string]: unknown };

/** Stands in for the backend's `llm-settings` and `chat` services. */
class FeathersStub extends Service {
  settings = { ...SETTINGS };
  patches: Record<string, unknown>[] = [];
  requests: ChatRequest[] = [];
  listeners = new Set<Listener>();
  /** What `chat.create` does; by default the turn starts and events follow. */
  onCreate: (data: ChatRequest) => Promise<unknown> = async (data) => ({
    requestId: data['requestId'],
    status: 'started',
  });

  /** Sends a progress event for the most recent request, as the server does. */
  emit(event: Record<string, unknown>) {
    const requestId = this.requests[this.requests.length - 1]?.['requestId'];
    this.listeners.forEach((listener) => listener({ requestId, ...event }));
  }

  /** What the browser sent back for simulations the assistant asked for. */
  simulations: Record<string, unknown>[] = [];
  graph: Record<string, MemoryService> = {
    'models-versions': memory([VERSION]),
    nodes: memory(NODES),
    edges: memory(EDGES),
  };

  app = {
    service: (name: string) =>
      this.graph[name] ??
      (name === 'llm-settings'
        ? {
            get: async () => ({ ...this.settings }),
            patch: async (_id: string, data: Record<string, unknown>) => {
              this.patches.push(data);
              if ('openRouterKey' in data) {
                this.settings.hasOpenRouterKey = data['openRouterKey'] !== null;
              }
              if ('model' in data) {
                this.settings.model = data['model'] as null;
              }
              return { ...this.settings };
            },
          }
        : {
            create: async (data: ChatRequest) => {
              this.requests.push(data);
              return this.onCreate(data);
            },
            on: (_event: string, listener: Listener) =>
              this.listeners.add(listener),
            removeListener: (_event: string, listener: Listener) =>
              this.listeners.delete(listener),
            submitSimulation: async (data: Record<string, unknown>) => {
              this.simulations.push(data);
              return { simulationId: data['simulationId'] };
            },
          }),
  };
}

const done = (content: string, extra: Record<string, unknown> = {}) => ({
  type: 'done',
  response: {
    status: 'completed',
    message: { role: 'assistant', content },
    toolCalls: [],
    limitReached: false,
    ...extra,
  },
});

module(
  'Integration | Component | sidebar-general/views/assistant',
  function (hooks) {
    setupRenderingTest(hooks);
    setupIntl(hooks, 'en-us');

    let feathers: FeathersStub;

    hooks.beforeEach(function (this: TestContext) {
      window.localStorage.removeItem('umb-assistant-consent');
      this.owner.register('service:feathers', FeathersStub);
      feathers = this.owner.lookup(
        'service:feathers',
      ) as unknown as FeathersStub;
      (this.owner as unknown as { setupRouter(): void }).setupRouter();
      this.set('modelVersion', { id: 'version-1', canEdit: true });
    });

    hooks.afterEach(function () {
      window.localStorage.removeItem('umb-assistant-consent');
    });

    const renderView = () =>
      render(
        hbs`<SidebarGeneral::Views::Assistant @modelVersion={{this.modelVersion}} />`,
      );

    const send = async (text: string) => {
      await fillIn('#assistant-draft', text);
      await click('.umb-assistant__composer button[type="submit"]');
    };

    test('asks for the API key and the consent before the first use', async function (assert) {
      feathers.settings.hasOpenRouterKey = false;
      await renderView();

      assert.dom('[data-test-assistant-setup]').exists();
      assert.dom('#assistant-draft').doesNotExist();
      assert
        .dom('[data-test-assistant-setup] button[type="submit"]')
        .isDisabled();

      await fillIn('#assistant-key', KEY);
      assert
        .dom('[data-test-assistant-setup] button[type="submit"]')
        .isDisabled('the key alone is not enough');

      await click('#assistant-consent');
      await click('[data-test-assistant-setup] button[type="submit"]');

      assert.deepEqual(feathers.patches, [{ openRouterKey: KEY }]);
      assert.dom('[data-test-assistant-setup]').doesNotExist();
      assert.dom('#assistant-draft').exists();
      assert.dom('[data-test-assistant-empty]').exists();
      assert.strictEqual(
        window.localStorage.getItem('umb-assistant-consent'),
        'true',
      );
    });

    test('says so when the server has no assistant', async function (assert) {
      feathers.settings.chatAvailable = false;
      await renderView();

      assert.dom('[data-test-assistant-unavailable]').exists();
      assert.dom('[data-test-assistant-setup]').doesNotExist();
    });

    test('shows a turn while it runs and its answer when it is done', async function (assert) {
      await renderView();
      await send('Add a stock for trees.');

      assert
        .dom('[data-test-assistant-message="user"]')
        .hasText('Add a stock for trees.');
      assert.dom('[data-test-assistant-running]').exists();
      assert.dom('#assistant-draft').hasValue('');
      assert.strictEqual(feathers.requests.length, 1);
      assert.strictEqual(feathers.requests[0]?.['modelVersionId'], 'version-1');
      assert.strictEqual(feathers.requests[0]?.['model'], 'vendor/model-a');
      assert.true(feathers.requests[0]?.['createCheckpoint']);
      assert.deepEqual(feathers.requests[0]?.['messages'], [
        { role: 'user', content: 'Add a stock for trees.' },
      ]);

      feathers.emit({ type: 'tool_call', id: 'c1', name: 'apply_graph_patch' });
      await settled();
      assert
        .dom('[data-test-assistant-running]')
        .includesText('Changed the model');
      assert.dom('[data-test-assistant-running] .spinner-border').exists();

      feathers.emit({
        type: 'tool_result',
        id: 'c1',
        name: 'apply_graph_patch',
        ok: true,
      });
      feathers.emit({ type: 'text_delta', text: 'I added ' });
      feathers.emit({ type: 'text_delta', text: 'the stock.' });
      await settled();
      assert
        .dom('[data-test-assistant-running] .spinner-border')
        .doesNotExist();
      assert
        .dom('[data-test-assistant-running]')
        .includesText('I added the stock.');

      feathers.emit(
        done('I added the stock "Trees".', {
          toolCalls: [{ name: 'apply_graph_patch', ok: true }],
          checkpoint: {
            name: 'City Trees (backup)',
            modelId: 'm2',
            modelVersionId: 'v2',
          },
        }),
      );
      await settled();

      assert.dom('[data-test-assistant-running]').doesNotExist();
      assert
        .dom('[data-test-assistant-message="assistant"]')
        .includesText('I added the stock "Trees".');
      assert
        .dom('[data-test-assistant-message="assistant"]')
        .includesText('Changed the model');
      assert
        .dom('[data-test-assistant-message="checkpoint"]')
        .includesText('City Trees (backup)');
      assert.strictEqual(
        feathers.listeners.size,
        0,
        'the turn no longer listens',
      );

      // the next message carries the conversation and asks for no second backup
      await send('Thanks');
      assert.false(feathers.requests[1]?.['createCheckpoint']);
      assert.deepEqual(feathers.requests[1]?.['messages'], [
        { role: 'user', content: 'Add a stock for trees.' },
        { role: 'assistant', content: 'I added the stock "Trees".' },
        { role: 'user', content: 'Thanks' },
      ]);
    });

    test('ignores events of other requests', async function (assert) {
      await renderView();
      await send('Hi');

      feathers.listeners.forEach((listener) =>
        listener({
          requestId: 'someone-else',
          type: 'text_delta',
          text: 'not mine',
        }),
      );
      await settled();

      assert
        .dom('[data-test-assistant-running]')
        .doesNotIncludeText('not mine');
    });

    test('sends with Enter and keeps Shift+Enter for new lines', async function (assert) {
      await renderView();
      await fillIn('#assistant-draft', 'Hi');

      await triggerKeyEvent('#assistant-draft', 'keydown', 'Enter', {
        shiftKey: true,
      });
      assert.strictEqual(feathers.requests.length, 0);

      await triggerKeyEvent('#assistant-draft', 'keydown', 'Enter');
      assert.strictEqual(feathers.requests.length, 1);
    });

    test('explains a failed turn and offers to replace a rejected key', async function (assert) {
      await renderView();
      await send('Hi');
      feathers.emit({ type: 'error', message: 'x', reason: 'invalid_api_key' });
      await settled();

      assert.dom('[data-test-assistant-running]').doesNotExist();
      assert
        .dom('[data-test-assistant-message="error"]')
        .includesText('did not accept the API key');

      await click('[data-test-assistant-message="error"] button');
      assert.dom('[data-test-assistant-setup]').exists();
    });

    test('explains reaching the hourly limit and names geodata tools', async function (assert) {
      await renderView();
      await send('Find population data');
      feathers.emit({ type: 'tool_call', id: 'g1', name: 'list_ogc_datasets' });
      await settled();
      assert
        .dom('[data-test-assistant-running]')
        .includesText('Searched geodata');

      feathers.emit({
        type: 'error',
        message: 'x',
        reason: 'too_many_messages',
      });
      await settled();
      assert
        .dom('[data-test-assistant-message="error"]')
        .includesText('limit of messages per hour');
    });

    test('runs the simulations of the assistant in the browser', async function (assert) {
      await renderView();
      await send('Simulate the model');
      feathers.emit({ type: 'tool_call', id: 's1', name: 'simulate' });
      feathers.emit({
        type: 'simulation_request',
        simulationId: 'sim-1',
        modelVersionId: VERSION.id,
        parameterValues: { rate: 10 },
        maxPoints: 3,
      });
      await waitUntil(() => feathers.simulations.length > 0);

      const [answer] = feathers.simulations as {
        simulationId: string;
        summary: {
          steps: number;
          sampledTimes: number[];
          series: { name: string; type: string; values: number[] }[];
        };
      }[];
      assert.strictEqual(answer!.simulationId, 'sim-1');
      assert.strictEqual(answer!.summary.steps, 11);
      assert.deepEqual(answer!.summary.sampledTimes, [0, 5, 10]);
      const trees = answer!.summary.series.find(
        (series) => series.name === 'Trees',
      );
      // the parameter value of the request is used: 100 trees plus 10 per year
      assert.deepEqual(trees?.values, [100, 150, 200]);
      assert.strictEqual(trees?.type, 'stock');
    });

    test('reports a failing simulation in the browser to the assistant', async function (assert) {
      await feathers.graph['nodes']!.patch('rate', {
        data: { value: '1 +* 2' },
      });
      await renderView();
      await send('Simulate the model');
      feathers.emit({
        type: 'simulation_request',
        simulationId: 'sim-2',
        modelVersionId: VERSION.id,
        parameterValues: {},
        maxPoints: 3,
      });
      await waitUntil(() => feathers.simulations.length > 0);

      const [answer] = feathers.simulations as {
        error: { message: string; nodeId: string | null };
      }[];
      assert.ok(answer!.error.message.length > 0);
      assert.strictEqual(answer!.error.nodeId, 'rate');
      assert.notOk('summary' in answer!);
    });

    test('explains a turn that could not start', async function (assert) {
      feathers.onCreate = async () => {
        throw Object.assign(new Error('busy'), { name: 'Conflict' });
      };
      await renderView();
      await send('Hi');

      assert
        .dom('[data-test-assistant-message="error"]')
        .includesText('still working');
      assert.dom('[data-test-assistant-running]').doesNotExist();
      assert.strictEqual(feathers.listeners.size, 0);
    });

    test('changes the model and removes the key in the settings', async function (assert) {
      await renderView();
      assert.dom('#assistant-model').doesNotExist();

      await click('[data-test-assistant-settings]');
      await fillIn('#assistant-model', 'vendor/model-b');
      assert.deepEqual(feathers.patches, [{ model: 'vendor/model-b' }]);

      await click('[data-test-assistant-remove-key]');
      assert.deepEqual(feathers.patches[1], { openRouterKey: null });
      assert.dom('[data-test-assistant-setup]').exists();
    });

    test('starts a new conversation', async function (assert) {
      await renderView();
      await send('Hi');
      feathers.emit(done('Hello.'));
      await settled();

      await click('[data-test-assistant-clear]');

      assert.dom('[data-test-assistant-message]').doesNotExist();
      assert.dom('[data-test-assistant-empty]').exists();
    });
  },
);
