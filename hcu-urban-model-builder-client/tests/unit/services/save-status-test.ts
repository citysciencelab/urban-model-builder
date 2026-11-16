import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';
import type SaveStatusService from 'hcu-urban-model-builder-client/services/save-status';

module('Unit | Service | save-status', function (hooks) {
  setupTest(hooks);

  test('it follows a write from saving to saved', async function (assert) {
    const service = this.owner.lookup(
      'service:save-status',
    ) as SaveStatusService;
    let finish!: (value: string) => void;
    const write = service.track(new Promise<string>((r) => (finish = r)));

    assert.true(service.isSaving);
    assert.strictEqual(service.lastSavedAt, null);

    finish('ok');
    assert.strictEqual(await write, 'ok', 'the result is passed through');
    assert.false(service.isSaving);
    assert.ok(service.lastSavedAt);
    assert.false(service.hasError);
  });

  test('it reports a failed write and passes the error on', async function (assert) {
    const service = this.owner.lookup(
      'service:save-status',
    ) as SaveStatusService;

    await assert.rejects(service.track(Promise.reject(new Error('offline'))));
    assert.true(service.hasError);
    assert.false(service.isSaving);

    service.reset();
    assert.false(service.hasError);
  });
});
