import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module(
  'Integration | Component | sidebar-general/parameter-select',
  function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.set('myAction', function(val) { ... });

      await render(hbs`<SidebarGeneral::ParameterSelect />`);

      assert.dom().hasText('');

      // Template block usage:
      await render(hbs`
      <SidebarGeneral::ParameterSelect>
        template block text
      </SidebarGeneral::ParameterSelect>
    `);

      assert.dom().hasText('template block text');
    });
  },
);
