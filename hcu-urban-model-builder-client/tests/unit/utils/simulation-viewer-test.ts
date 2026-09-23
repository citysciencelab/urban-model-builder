import { module, test } from 'qunit';
import { toViewerNodes } from 'hcu-urban-model-builder-client/utils/simulation-viewer';

module('Unit | Utility | simulation-viewer', function () {
  const names: Record<string, string> = {
    n1: 'Anteil_WP',
    n2: 'Population Vermietende',
    s1: 'Umgestiegen_WP',
    s2: 'Investitionswillig',
    n3: 'Vektor',
    n4: 'Record',
    n5: 'Schalter',
  };
  const nameOf = (id: string) => names[id] ?? id;

  test('scalar series are keyed by node name', function (assert) {
    const out = toViewerNodes({ n1: { series: [0.1, 0.2, NaN] } }, nameOf);
    assert.deepEqual(out, {
      Anteil_WP: { kind: 'scalar', values: [0.1, 0.2, null] },
    });
  });

  test('booleans become 0/1', function (assert) {
    const out = toViewerNodes({ n5: { series: [true, false] } }, nameOf);
    assert.deepEqual(out['Schalter']?.values, [1, 0]);
  });

  test('populations are counted per state', function (assert) {
    const out = toViewerNodes(
      {
        n2: {
          series: [
            [
              { id: 'a', location: [0, 0], state: ['s2'] },
              { id: 'b', location: [0, 0], state: ['s2'] },
              { id: 'c', location: [0, 0], state: [] },
            ],
            [
              { id: 'a', location: [0, 0], state: ['s1'] },
              { id: 'b', location: [0, 0], state: ['s2'] },
              { id: 'c', location: [0, 0], state: [] },
            ],
          ],
        },
      },
      nameOf,
    );
    assert.deepEqual(out, {
      'Population Vermietende · Investitionswillig': {
        kind: 'population',
        values: [2, 1],
        unit: 'Agenten',
      },
      'Population Vermietende · (ohne Zustand)': {
        kind: 'population',
        values: [1, 1],
        unit: 'Agenten',
      },
      'Population Vermietende · Umgestiegen_WP': {
        kind: 'population',
        values: [0, 1],
        unit: 'Agenten',
      },
    });
  });

  test('vectors and records get one series per element', function (assert) {
    const out = toViewerNodes(
      {
        n3: {
          series: [
            [1, 2],
            [3, 4],
          ],
        },
        n4: { series: [{ a: 1 }, { a: 2, b: 5 }] },
      },
      nameOf,
    );
    assert.deepEqual(out['Vektor · 1']?.values, [1, 3]);
    assert.deepEqual(out['Vektor · 2']?.values, [2, 4]);
    assert.deepEqual(out['Record · a']?.values, [1, 2]);
    assert.deepEqual(out['Record · b']?.values, [null, 5]);
  });
});
