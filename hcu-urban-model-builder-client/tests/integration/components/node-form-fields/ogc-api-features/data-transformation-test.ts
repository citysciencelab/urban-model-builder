import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, find, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { TrackedAsyncData } from 'ember-async-data';
import { setupIntl } from 'ember-intl/test-support';

module(
  'Integration | Component | node-form-fields/ogc-api-features/data-transformation',
  function (hooks) {
    setupRenderingTest(hooks);
    setupIntl(hooks, 'en-us');

    async function renderComponent() {
      await render(hbs`
        <BsForm @model={{this.model}} as |form|>
          <BsAccordion @selected="data-transformation" as |acc|>
            <NodeFormFields::OgcApiFeatures::DataTransformation
              @acc={{acc}}
              @form={{form}}
              @changeset={{this.changeset}}
              @propertiesSchema={{this.propertiesSchema}}
            />
          </BsAccordion>
        </BsForm>
      `);
    }

    test('it renders while no collection is selected (schema resolved to null)', async function (assert) {
      this.set('model', {});
      this.set('changeset', { dataProxy: { data: { query: {} } } });
      this.set('propertiesSchema', new TrackedAsyncData(Promise.resolve(null)));

      // used to throw "Cannot read properties of null (reading 'push')" and freeze the whole node form
      await renderComponent();

      assert.dom('.ember-power-select-multiple-trigger').exists();
      assert.notEqual(
        find('.ember-power-select-multiple-trigger')?.getAttribute(
          'aria-disabled',
        ),
        'true',
        'the value select is enabled',
      );
    });

    test('it offers the collection properties plus the geometry as values', async function (assert) {
      this.set('model', {});
      this.set('changeset', { dataProxy: { data: { query: {} } } });
      this.set(
        'propertiesSchema',
        new TrackedAsyncData(
          Promise.resolve([
            { id: 'name', title: 'Name', type: 'string' },
            { id: 'count', title: 'Count', type: 'integer' },
          ]),
        ),
      );

      await renderComponent();
      await click('.ember-power-select-multiple-trigger');

      assert
        .dom('.ember-power-select-option')
        .exists({ count: 3 }, 'two properties and the geometry');
      assert.dom('.ember-power-select-options').containsText('Geometry');
    });

    test('it omits the geometry when it is skipped', async function (assert) {
      this.set('model', {});
      this.set('changeset', {
        dataProxy: { data: { query: { skipGeometry: true } } },
      });
      this.set(
        'propertiesSchema',
        new TrackedAsyncData(
          Promise.resolve([{ id: 'name', title: 'Name', type: 'string' }]),
        ),
      );

      await renderComponent();
      await click('.ember-power-select-multiple-trigger');

      assert.dom('.ember-power-select-option').exists({ count: 1 });
      assert.dom('.ember-power-select-options').doesNotContainText('Geometry');
    });
  },
);
