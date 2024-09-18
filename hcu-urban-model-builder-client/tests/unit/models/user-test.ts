import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | user', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('user', {});
    assert.ok(model, 'model exists');
  });
});
