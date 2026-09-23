import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, fillIn, render, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import Service from '@ember/service';
import SimulateModal from 'hcu-urban-model-builder-client/components/floating-toolbar/simulate-modal';

function result(x: number) {
  return { times: [2025, 2026, 2027], nodes: { n1: { series: [x, x, x] } } };
}

module(
  'Integration | Component | floating-toolbar/simulate-modal – saving',
  function (hooks) {
    setupRenderingTest(hooks);
    setupIntl(hooks, 'de-de');

    const proto = SimulateModal.prototype as any;
    const originalRunSimulation = proto.runSimulation;
    let created: any[];
    let simulations: number;

    hooks.beforeEach(function () {
      created = [];
      simulations = 0;
      const node = { id: 'n1', name: 'X', type: 1, isOutputParameter: true };
      this.owner.register(
        'service:feathers',
        class extends Service {
          getServiceNameByModelName(modelName: string) {
            return `${modelName}s`;
          }
          app = {
            service: (name: string) =>
              name === 'simulation-results'
                ? {
                    create: async (data: unknown) => {
                      created.push(data);
                      return data;
                    },
                  }
                : { get: async () => node, find: async () => [node] },
          };
        },
      );
      const store = this.owner.lookup('service:store') as any;
      store.push({
        data: { id: 'n1', type: 'node', attributes: { name: 'X', type: 1 } },
      });
      this.set('model', {
        id: 'v1',
        majorVersion: 0,
        minorVersion: 0,
        draftVersion: 1,
        timeStart: 2025,
        timeLength: 2,
        model: Promise.resolve({ id: 'm1', internalName: 'Testmodell' }),
        nodes: Promise.resolve([node]),
      });
    });

    hooks.afterEach(function () {
      proto.runSimulation = originalRunSimulation;
    });

    // opens the simulate dropdown, waits for the first (displayed) run and opens the save panel
    async function openSavePanel() {
      await render(
        hbs`<FloatingToolbar::SimulateModal @model={{this.model}} />`,
      );
      await click('.ember-basic-dropdown-trigger');
      await waitFor('[title="Simulationsergebnisse speichern"]', {
        timeout: 5000,
      });
      await click('[title="Simulationsergebnisse speichern"]');
    }

    test('a batch saves the shown run and simulates the rest', async function (assert) {
      proto.runSimulation = async () => result(++simulations);
      await openSavePanel();

      await fillIn('.save-simulation-panel input[type="text"]', 'Basis');
      await fillIn('.save-simulation-panel input[type="number"]', '3');
      assert
        .dom('.save-simulation-panel button[type="submit"]')
        .hasText('3 Läufe rechnen und speichern');

      await click('.save-simulation-panel button[type="submit"]');
      await waitFor('.save-simulation-panel .alert-success', { timeout: 5000 });

      assert
        .dom('.save-simulation-panel .alert-success')
        .includesText('3 Läufe gespeichert.');
      // one run for the display, two more for the batch
      assert.strictEqual(simulations, 3);
      assert.deepEqual(
        created.map((d) => [d.name, d.metadata.run, d.metadata.runs]),
        [
          ['Basis', 1, 3],
          ['Basis', 2, 3],
          ['Basis', 3, 3],
        ],
      );
      assert.deepEqual(
        created.map((d) => d.results.nodes.X.values),
        [
          [1, 1, 1],
          [2, 2, 2],
          [3, 3, 3],
        ],
      );
    });

    test('a single run saves the result shown', async function (assert) {
      proto.runSimulation = async () => result(++simulations);
      await openSavePanel();

      assert
        .dom('.save-simulation-panel button[type="submit"]')
        .hasText('Speichern');
      await click('.save-simulation-panel button[type="submit"]');
      await waitFor('.save-simulation-panel .alert-success', { timeout: 5000 });

      assert.strictEqual(simulations, 1);
      assert.strictEqual(created.length, 1);
      assert.notOk('run' in created[0].metadata);
    });

    test('the number of runs is limited to 20', async function (assert) {
      proto.runSimulation = async () => result(++simulations);
      await openSavePanel();

      await fillIn('.save-simulation-panel input[type="number"]', '50');
      assert
        .dom('.save-simulation-panel button[type="submit"]')
        .hasText('20 Läufe rechnen und speichern');
    });

    test('a batch can be canceled', async function (assert) {
      // the displayed run finishes, the batch runs never do
      proto.runSimulation = () =>
        ++simulations === 1
          ? Promise.resolve(result(1))
          : new Promise(() => {});
      await openSavePanel();

      await fillIn('.save-simulation-panel input[type="number"]', '5');
      await click('.save-simulation-panel button[type="submit"]');
      await waitFor('.save-simulation-panel .progress', { timeout: 5000 });
      assert.dom('.save-simulation-panel').includesText('Lauf 2 von 5');

      await click('.save-simulation-panel .btn-secondary');
      await waitFor('.save-simulation-panel .alert-danger', { timeout: 5000 });

      assert
        .dom('.save-simulation-panel .alert-danger')
        .hasText('Abgebrochen – 1 von 5 Läufen gespeichert.');
      assert.strictEqual(created.length, 1);
      // the form is back for another try
      assert.dom('.save-simulation-panel button[type="submit"]').exists();
    });

    test('an error reports how many runs were saved', async function (assert) {
      proto.runSimulation = async () => {
        if (++simulations === 3) throw new Error('Formelfehler');
        return result(simulations);
      };
      await openSavePanel();

      await fillIn('.save-simulation-panel input[type="number"]', '4');
      await click('.save-simulation-panel button[type="submit"]');
      await waitFor('.save-simulation-panel .alert-danger', { timeout: 5000 });

      assert
        .dom('.save-simulation-panel .alert-danger')
        .hasText(
          'Fehler beim Speichern der Simulationsergebnisse (2 von 4 Läufen gespeichert): Formelfehler',
        );
      assert.strictEqual(created.length, 2);
    });
  },
);
