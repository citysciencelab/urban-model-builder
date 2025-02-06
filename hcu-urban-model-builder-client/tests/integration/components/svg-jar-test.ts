import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | svg-jar', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<SvgJar />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <SvgJar>
        template block text
      </SvgJar>
    `);

    assert.dom().hasText('template block text');
  });
});
