import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | node', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('node', {});
    assert.ok(model, 'model exists');
  });
});
