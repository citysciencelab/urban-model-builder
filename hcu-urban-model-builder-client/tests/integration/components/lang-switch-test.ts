import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';

module('Integration | Component | lang-switch', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  test('it offers the other language', async function (assert) {
    await render(hbs`<LangSwitch />`);

    assert.dom('button').hasText('DE');
    assert.dom('button').hasAttribute('lang', 'de-de');
  });
});
