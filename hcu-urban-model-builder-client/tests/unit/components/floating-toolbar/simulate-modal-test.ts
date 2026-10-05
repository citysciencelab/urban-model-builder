import { module, test } from 'qunit';
import config from 'hcu-urban-model-builder-client/config/environment';
import SimulateModal, {
  clampDeviationCount,
} from 'hcu-urban-model-builder-client/components/floating-toolbar/simulate-modal';

// Glimmer refuses components created outside the renderer, and rendering this
// one needs most of the app. The batch-field members only read plain fields,
// so they are called with a minimal `this` instead.
type BatchFieldState = {
  deviationCount?: number;
  storedBatchDatasets?: unknown[];
};

const callGetter = (name: string, self: BatchFieldState) =>
  Object.getOwnPropertyDescriptor(SimulateModal.prototype, name)!.get!.call(
    self,
  );

const callAction = (name: string, self: BatchFieldState, event: unknown) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    SimulateModal.prototype,
    name,
  )!;
  // `@action` either leaves the method in place or wraps it in a binding getter.
  const method = (descriptor.value ?? descriptor.get!.call(self)) as (
    event: unknown,
  ) => void;
  method.call(self, event);
};

module('Unit | Component | floating-toolbar/simulate-modal', function () {
  test('the batch ceiling of 5 runs comes from the configuration', function (assert) {
    assert.strictEqual(config.APP.MAX_SIMULATION_BATCH_RUNS, 5);
    assert.strictEqual(
      callGetter('maxDeviationCount', {}),
      5,
      'max of the batch field',
    );
  });

  test('batch sizes are limited to 1 to 5 runs', function (assert) {
    assert.strictEqual(clampDeviationCount(3), 3);
    assert.strictEqual(clampDeviationCount(6), 5);
    assert.strictEqual(
      clampDeviationCount('50'),
      5,
      'a value from an earlier ceiling',
    );
    assert.strictEqual(clampDeviationCount('2.7'), 2);
    assert.strictEqual(clampDeviationCount(0), 1);
    assert.strictEqual(clampDeviationCount(''), 1);
    assert.strictEqual(clampDeviationCount('abc'), 1);
  });

  test('the batch field limits typed values', function (assert) {
    const state: BatchFieldState = { deviationCount: 1 };

    callAction('updateDeviationCount', state, { target: { value: '9' } });

    assert.strictEqual(state.deviationCount, 5);
  });

  test('a stored result with the maximum number of runs cannot grow', function (assert) {
    const isFull = (runs: number) =>
      callGetter('isStoredBatchFull', {
        storedBatchDatasets: new Array(runs).fill({}),
      });

    assert.false(isFull(4));
    assert.true(isFull(5));
    assert.true(isFull(15), 'results saved under the old ceiling');
  });
});
