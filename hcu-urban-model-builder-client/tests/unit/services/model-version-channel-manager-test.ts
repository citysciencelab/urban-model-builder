import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';

module('Unit | Service | model-version-channel-manager', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    const service = this.owner.lookup('service:model-version-channel-manager');
    assert.ok(service);
  });
});
