import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';
import type ModelValidationService from 'hcu-urban-model-builder-client/services/model-validation';
import type { SimulationModelData } from 'hcu-urban-model-builder-backend';
import type {
  ModelValidationRequest,
  ModelValidationResponse,
} from 'hcu-urban-model-builder-client/workers/model-validation';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  requests: ModelValidationRequest[] = [];
  terminated = false;

  postMessage(request: ModelValidationRequest) {
    this.requests.push(request);
  }

  terminate() {
    this.terminated = true;
  }

  // Answers the most recent request.
  respond(
    response:
      | { type: 'ok' }
      | { type: 'invalid'; nodeId: string; message: string }
      | { type: 'failed'; error: { name: string; message: string } },
  ) {
    const id = this.requests[this.requests.length - 1]!.id;
    this.onmessage?.({
      data: { id, ...response } as ModelValidationResponse,
    } as MessageEvent);
  }

  crash(message: string) {
    this.onerror?.({ message, preventDefault() {} } as unknown as ErrorEvent);
  }
}

const snapshot = {
  modelVersion: {},
  nodes: [],
  edges: [],
} as unknown as SimulationModelData;

module('Unit | Service | model-validation', function (hooks) {
  setupTest(hooks);

  let service: ModelValidationService;
  let workers: FakeWorker[];
  let originalConsoleError: typeof console.error;
  let consoleErrors: unknown[][];

  hooks.beforeEach(function () {
    service = this.owner.lookup('service:model-validation');
    workers = [];
    service.createWorker = () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    };
    originalConsoleError = console.error;
    consoleErrors = [];
    console.error = (...args: unknown[]) => consoleErrors.push(args);
  });

  hooks.afterEach(function () {
    console.error = originalConsoleError;
  });

  test('a new request terminates the running check', async function (assert) {
    const first = service.validate('version-1', snapshot);
    const second = service.validate('version-1', snapshot);

    assert.strictEqual(
      workers.length,
      2,
      'the second request gets a fresh worker',
    );
    assert.true(workers[0]!.terminated, 'the running check is terminated');
    assert.strictEqual(
      await first,
      null,
      'the superseded check resolves with null',
    );

    workers[1]!.respond({ type: 'ok' });
    assert.deepEqual(await second, {});
  });

  test('an idle worker is reused', async function (assert) {
    const first = service.validate('version-1', snapshot);
    workers[0]!.respond({ type: 'ok' });
    await first;

    const second = service.validate('version-1', snapshot);
    workers[0]!.respond({ type: 'ok' });
    await second;

    assert.strictEqual(workers.length, 1);
    assert.false(workers[0]!.terminated);
  });

  test('passes the model version and the snapshot to the worker', function (assert) {
    void service.validate('version-1', snapshot);

    assert.strictEqual(workers[0]!.requests[0]!.modelVersionId, 'version-1');
    assert.strictEqual(workers[0]!.requests[0]!.snapshot, snapshot);
  });

  test('an error is reported at the node it belongs to', async function (assert) {
    const result = service.validate('version-1', snapshot);
    workers[0]!.respond({
      type: 'invalid',
      nodeId: 'node-2',
      message: 'The primitive [CO2_Preis] has an equation error.',
    });

    assert.deepEqual(await result, {
      'node-2': 'The primitive [CO2_Preis] has an equation error.',
    });
  });

  test('a crashing worker marks no node and only logs', async function (assert) {
    const result = service.validate('version-1', snapshot);
    workers[0]!.crash('Out of memory');

    assert.deepEqual(await result, {}, 'no node is marked');
    assert.true(workers[0]!.terminated, 'the broken worker is discarded');
    assert.strictEqual(
      consoleErrors.length,
      1,
      'the failure goes to the console',
    );

    const next = service.validate('version-1', snapshot);
    assert.strictEqual(workers.length, 2, 'the next check starts a new worker');
    workers[1]!.respond({ type: 'ok' });
    assert.deepEqual(await next, {});
  });

  test('a check that fails without a node marks no node and only logs', async function (assert) {
    const result = service.validate('version-1', snapshot);
    workers[0]!.respond({
      type: 'failed',
      error: { name: 'TypeError', message: 'x is undefined' },
    });

    assert.deepEqual(await result, {});
    assert.strictEqual(consoleErrors.length, 1);
  });

  test('cancel stops a running check', async function (assert) {
    const result = service.validate('version-1', snapshot);
    service.cancel();

    assert.strictEqual(await result, null);
    assert.true(workers[0]!.terminated);
  });
});
