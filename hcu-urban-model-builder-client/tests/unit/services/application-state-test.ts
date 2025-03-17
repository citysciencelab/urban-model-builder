import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';

module('Unit | Service | application-state', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    const service = this.owner.lookup('service:application-state');
    assert.ok(service);
  });
});
