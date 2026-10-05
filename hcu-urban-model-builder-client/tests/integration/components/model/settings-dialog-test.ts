import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, find, findAll, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import Service from '@ember/service';
import type Store from '@ember-data/store';
import type { TestContext } from '@ember/test-helpers';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

class FeathersStub extends Service {
  patches: Record<string, unknown>[] = [];
  getServiceNameByModelName(modelName: string) {
    return `${modelName}s`;
  }
  app = {
    service: () => ({
      patch: async (id: string, data: Record<string, unknown>) => {
        this.patches.push(data);
        return { ...data, id };
      },
    }),
  };
}

interface Context extends TestContext {
  model: ModelsVersion;
  feathers: FeathersStub;
  closed: boolean;
  onClose: () => void;
}

module('Integration | Component | model/settings-dialog', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'de-de');

  hooks.beforeEach(function (this: Context) {
    this.owner.register('service:feathers', FeathersStub);
    this.feathers = this.owner.lookup(
      'service:feathers',
    ) as unknown as FeathersStub;

    const store = this.owner.lookup('service:store') as Store;
    store.push({
      data: {
        type: 'models-version',
        id: 'version',
        attributes: {
          timeStart: 2025,
          timeLength: 15,
          timeStep: 1,
          timeUnits: 'Years',
          algorithm: 'Euler',
          globals: '',
          autoSimulate: false,
        },
      },
    });
    this.model = store.peekRecord('models-version', 'version') as ModelsVersion;
    this.closed = false;
    this.onClose = () => (this.closed = true);
  });

  const renderDialog = async () => {
    await render(hbs`
      <Model::SettingsDialog @model={{this.model}} @open={{true}} @onClose={{this.onClose}} />
    `);
  };

  // The switch is the form element labelled "Automatisch simulieren".
  const autoSimulateSwitch = () => {
    const label = findAll('.modal label').find(
      (element) => element.textContent?.trim() === 'Automatisch simulieren',
    );
    return find(`#${label?.getAttribute('for')}`) as HTMLInputElement;
  };

  test('shows the automatic simulation switch, switched off', async function (this: Context, assert) {
    await renderDialog();

    assert.ok(autoSimulateSwitch(), 'the switch is there');
    assert.dom(autoSimulateSwitch()).isNotChecked();
    assert
      .dom('.modal')
      .includesText('Startet nach jeder Änderung eine neue Simulation.');
  });

  test('saves the switch with the model version', async function (this: Context, assert) {
    await renderDialog();

    await click(autoSimulateSwitch());
    await click('.modal-footer .btn-primary');

    assert.true(this.model.autoSimulate);
    assert.strictEqual(this.feathers.patches.length, 1);
    assert.true(this.feathers.patches[0]!['autoSimulate']);
    assert.true(this.closed, 'the dialog closes');
  });
});
