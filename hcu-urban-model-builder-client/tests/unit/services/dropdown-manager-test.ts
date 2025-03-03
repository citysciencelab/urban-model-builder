import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';

module('Unit | Service | floating-toolbar-dropdown-manager', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    const service = this.owner.lookup(
      'service:floating-toolbar-dropdown-manager',
    );
    assert.ok(service);
  });
});
