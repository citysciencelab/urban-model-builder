import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, findAll, render, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const LS_KEY = 'umb-simulation-viewer:v1';

function run(
  id: string,
  name: string,
  b: number,
  x: number[],
  createdAt: string,
) {
  return {
    id,
    modelsVersionsId: 'v1',
    name,
    description: null,
    metadata: {
      modelId: 'v1',
      modelName: 'Testmodell',
      version: '0.0.1',
      timeStart: 2025,
      timeLength: 2,
      timeEnd: 2027,
      downloadTimestamp: createdAt,
    },
    scenario: { A: 1, B: b },
    results: {
      times: [2025, 2026, 2027],
      nodes: {
        X: { kind: 'scalar', values: x },
        'Population P · Zustand': {
          kind: 'population',
          values: [1, 2, 3],
          unit: 'Agenten',
        },
      },
    },
    createdAt,
  };
}

module('Integration | Component | simulation-viewer', function (hooks) {
  setupRenderingTest(hooks);

  let savedPrefs: string | null = null;

  hooks.beforeEach(function () {
    savedPrefs = localStorage.getItem(LS_KEY);
    localStorage.removeItem(LS_KEY);
  });

  hooks.afterEach(function () {
    if (savedPrefs == null) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, savedPrefs);
  });

  function stubResults(owner: any, results: unknown[]) {
    owner.register(
      'service:feathers',
      class extends Service {
        app = {
          service: () => ({
            find: async () => ({ total: results.length, data: results }),
          }),
        };
      },
    );
  }

  test('it shows an empty state without saved results', async function (assert) {
    stubResults(this.owner, []);
    this.set('model', { id: 'v1' });

    await render(hbs`<SimulationViewer @model={{this.model}} />`);
    await waitFor('.empty-state');

    assert.dom('.empty-state').includesText('Keine Simulationsergebnisse');
  });

  test('it averages runs with identical scenarios and compares them', async function (assert) {
    stubResults(this.owner, [
      run('r1', 'Basis', 2, [1, 2, 3], '2026-09-23T10:00:00Z'),
      run('r2', 'Basis', 2, [3, 4, 5], '2026-09-23T10:01:00Z'),
      run('r3', 'Variante', 3, [5, 6, 7], '2026-09-23T10:02:00Z'),
    ]);
    this.set('model', { id: 'v1' });

    await render(hbs`<SimulationViewer @model={{this.model}} />`);
    await waitFor('.run-chip');

    // one chip per scenario, both selected
    assert.deepEqual(
      findAll('.run-chip .chip-label').map((e) => e.textContent?.trim()),
      ['Basis', 'Variante'],
    );
    assert.dom('.run-chip.selected').exists({ count: 2 });
    assert.dom('.run-chip .chip-count').hasText('×2');

    // only the differing parameter is listed
    assert.dom('.scenario-diff tbody tr').exists({ count: 1 });
    assert.dom('.scenario-diff tbody tr td').hasText('B');
    assert.dom('.scenario-diff td.differs').hasText('3');

    // one chart per output, rendered by ECharts
    assert.dom('.chart-card').exists({ count: 2 });
    assert.dom('.chart-card h6').includesText('X');
    assert.dom('.chart-card .chart-container canvas').exists({ count: 2 });
    assert
      .dom('.simulation-viewer-main')
      .includesText('Mittelwert aus 2 Läufen');

    // single runs instead of averages
    await click('.runs-options input[type="checkbox"]');
    assert.deepEqual(
      findAll('.run-chip .chip-label').map((e) => e.textContent?.trim()),
      ['Basis (1)', 'Basis (2)', 'Variante'],
    );

    // deselect everything
    for (const chip of findAll('.run-chip.selected')) {
      await click(chip);
    }
    assert.dom('.run-chip.selected').doesNotExist();
    assert.dom('.chart-card').doesNotExist();
    assert.dom('.simulation-viewer-main').includesText('Kein Lauf ausgewählt.');
  });

  test('runs of a batch are averaged and numbered', async function (assert) {
    const batch = [1, 2, 3].map((i) => {
      const r = run(`b${i}`, 'Basis', 2, [i, i, i], `2026-09-23T11:0${i}:00Z`);
      Object.assign(r.metadata, { run: i, runs: 3 });
      return r;
    });
    stubResults(this.owner, batch);
    this.set('model', { id: 'v1' });

    await render(hbs`<SimulationViewer @model={{this.model}} />`);
    await waitFor('.run-chip');

    assert.dom('.run-chip').exists({ count: 1 });
    assert.dom('.run-chip .chip-label').hasText('Basis');
    assert.dom('.run-chip .chip-count').hasText('×3');

    await click('.runs-options input[type="checkbox"]');
    assert.deepEqual(
      findAll('.run-chip .chip-label').map((e) => e.textContent?.trim()),
      ['Basis · Lauf 1', 'Basis · Lauf 2', 'Basis · Lauf 3'],
    );
  });
});
