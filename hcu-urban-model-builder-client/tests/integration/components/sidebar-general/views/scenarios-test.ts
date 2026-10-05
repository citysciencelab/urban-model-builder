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
import type ScenarioSelectionService from 'hcu-urban-model-builder-client/services/scenario-selection';
import Service from '@ember/service';
import { Roles } from 'hcu-urban-model-builder-backend';

interface Context extends TestContext {
  modelVersion: ModelsVersion;
  store: Store;
  changes: number;
  createdScenarios: Record<string, unknown>[];
  scenarioSelection: ScenarioSelectionService;
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

      // Presets are created through the backend in a single request.
      const context = this;
      context.createdScenarios = [];
      class FeathersStub extends Service {
        app = {
          service: () => ({
            create: async (data: Record<string, unknown>) => {
              context.createdScenarios.push(data);
              return {
                id: 'preset',
                name: data['name'],
                isDefault: false,
                modelsVersionsId: data['modelsVersionsId'],
              };
            },
          }),
        };
        pushRecordIntoStore(modelName: string, record: Record<string, unknown>) {
          const store = context.store as unknown as {
            normalize: (modelName: string, record: unknown) => unknown;
            push: (document: unknown) => unknown;
          };
          return store.push(store.normalize(modelName, record));
        }
      }
      this.owner.register('service:feathers', FeathersStub);
      this.scenarioSelection = this.owner.lookup(
        'service:scenario-selection',
      ) as ScenarioSelectionService;
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

    test('the owner saves a preset with all its values in one request', async function (this: Context, assert) {
      this.modelVersion.role = Roles.owner;
      await renderPanel();

      await fillIn('input[type="range"]', '30');
      await fillIn('#scenario-name', 'Workshop A');
      await click('.scenario-panel__save .btn-primary');

      assert.deepEqual(this.createdScenarios, [
        {
          name: 'Workshop A',
          isDefault: false,
          modelsVersionsId: 'version',
          values: [
            { nodesId: 'bool', value: 0 },
            { nodesId: 'slider', value: 30 },
            { nodesId: 'select', value: 1 },
          ],
        },
      ]);
      assert
        .dom('#scenario-select option:checked')
        .hasText('Workshop A', 'the new preset is selected');
      assert.dom('.scenario-panel__save').doesNotExist('nothing left to save');
      assert.deepEqual(
        this.scenarioSelection.activePresetFor('version'),
        { id: 'preset', name: 'Workshop A' },
        'a run started now records the preset',
      );

      await fillIn('input[type="range"]', '31');

      assert.strictEqual(
        this.scenarioSelection.activePresetFor('version'),
        null,
        'changed values match no preset',
      );
    });

    test('others can reset their changes but not save presets', async function (this: Context, assert) {
      this.modelVersion.role = Roles.co_owner;
      await renderPanel();

      await fillIn('input[type="range"]', '30');

      assert.dom('#scenario-name').doesNotExist();
      assert.dom('.scenario-panel__save .btn-primary').doesNotExist();
      assert.dom('.scenario-panel__save button').hasText('Auf Standardeinstellungen zurücksetzen');
    });
  },
);
