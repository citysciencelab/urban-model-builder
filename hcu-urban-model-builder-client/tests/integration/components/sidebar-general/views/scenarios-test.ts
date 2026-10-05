import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, fillIn, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import { selectChoose } from 'ember-power-select/test-support';
import type Store from '@ember-data/store';
import type { TestContext } from '@ember/test-helpers';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type Scenario from 'hcu-urban-model-builder-client/models/scenario';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';

interface Context extends TestContext {
  modelVersion: ModelsVersion;
  store: Store;
  changes: number;
}

const scenarioValue = (context: Context, id: string) =>
  context.store.peekRecord('scenarios-value', id) as ScenariosValue;

module(
  'Integration | Component | sidebar-general/views/scenarios',
  function (hooks) {
    setupRenderingTest(hooks);
    setupIntl(hooks, 'de-de');

    hooks.beforeEach(function (this: Context) {
      this.store = this.owner.lookup('service:store') as Store;
      this.store.push({
        data: [
          {
            type: 'models-version',
            id: 'version',
            attributes: {},
            relationships: {
              scenarios: { data: [{ type: 'scenario', id: 'default' }] },
            },
          },
          {
            type: 'scenario',
            id: 'default',
            attributes: { name: 'Standard', isDefault: true },
            relationships: {
              modelsVersions: {
                data: { type: 'models-version', id: 'version' },
              },
              scenariosValues: {
                data: [
                  { type: 'scenarios-value', id: 'bool-value' },
                  { type: 'scenarios-value', id: 'slider-value' },
                  { type: 'scenarios-value', id: 'select-value' },
                ],
              },
            },
          },
          {
            type: 'node',
            id: 'bool',
            attributes: { name: 'Schalter', parameterType: 'boolean' },
          },
          {
            type: 'node',
            id: 'slider',
            attributes: {
              name: 'Regler',
              parameterType: 'slider',
              parameterMin: 0,
              parameterMax: 100,
              parameterStep: 1,
            },
          },
          {
            type: 'node',
            id: 'select',
            attributes: {
              name: 'Auswahl',
              parameterType: 'select',
              parameterOptions: {
                data: [
                  { value: 1, label: 'Eins' },
                  { value: 2, label: 'Zwei' },
                ],
              },
            },
          },
          {
            type: 'scenarios-value',
            id: 'bool-value',
            attributes: { value: 0 },
            relationships: {
              nodes: { data: { type: 'node', id: 'bool' } },
              scenarios: { data: { type: 'scenario', id: 'default' } },
            },
          },
          {
            type: 'scenarios-value',
            id: 'slider-value',
            attributes: { value: 10 },
            relationships: {
              nodes: { data: { type: 'node', id: 'slider' } },
              scenarios: { data: { type: 'scenario', id: 'default' } },
            },
          },
          {
            type: 'scenarios-value',
            id: 'select-value',
            attributes: { value: 1 },
            relationships: {
              nodes: { data: { type: 'node', id: 'select' } },
              scenarios: { data: { type: 'scenario', id: 'default' } },
            },
          },
        ],
      });
      this.modelVersion = this.store.peekRecord(
        'models-version',
        'version',
      ) as ModelsVersion;

      // The panel looks up the default scenario through the backend.
      const scenario = this.store.peekRecord('scenario', 'default') as Scenario;
      this.store.query = (async () => [scenario]) as unknown as Store['query'];

      this.changes = 0;
      const eventBus = this.owner.lookup('service:event-bus') as EventBus;
      eventBus.on('scenario-value-changed', () => this.changes++);
    });

    const renderPanel = async () => {
      await render(hbs`
        <SidebarGeneral::Views::Scenarios @modelVersion={{this.modelVersion}} />
        <BasicDropdownWormhole />
      `);
    };

    test('a click on a boolean parameter switches it exactly once', async function (this: Context, assert) {
      await renderPanel();

      await click('.form-switch input[type="checkbox"]');

      assert.strictEqual(Number(scenarioValue(this, 'bool-value').value), 1);
      assert.dom('.form-switch input[type="checkbox"]').isChecked();
      assert.strictEqual(this.changes, 1);

      await click('.form-switch input[type="checkbox"]');

      assert.strictEqual(Number(scenarioValue(this, 'bool-value').value), 0);
      assert.dom('.form-switch input[type="checkbox"]').isNotChecked();
      assert.strictEqual(this.changes, 2);
    });

    test('the slider changes the value in the store', async function (this: Context, assert) {
      await renderPanel();

      await fillIn('input[type="range"]', '30');

      assert.strictEqual(Number(scenarioValue(this, 'slider-value').value), 30);
      assert.strictEqual(this.changes, 1);
    });

    test('the select changes the value in the store', async function (this: Context, assert) {
      await renderPanel();

      await selectChoose('.ember-power-select-trigger', 'Zwei');

      assert.strictEqual(scenarioValue(this, 'select-value').value, 2);
      assert.strictEqual(this.changes, 1);
    });

    test('changed values stay unsaved until "Für alle speichern"', async function (this: Context, assert) {
      await renderPanel();

      await fillIn('input[type="range"]', '30');

      assert.true(scenarioValue(this, 'slider-value').hasDirtyAttributes);
    });
  },
);
