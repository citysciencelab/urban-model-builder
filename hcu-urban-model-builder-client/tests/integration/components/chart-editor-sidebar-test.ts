import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import type { TestContext } from '@ember/test-helpers';
import type { ChartEditorResult } from 'hcu-urban-model-builder-client/components/chart-editor-sidebar';

interface Context extends TestContext {
  results: ChartEditorResult[];
  expanded: string[];
  noop: () => void;
  onExpandResult: (resultId: string) => void;
}

const result = (
  id: string,
  changes: Partial<ChartEditorResult> = {},
): ChartEditorResult => ({
  id,
  name: `Ergebnis ${id}`,
  sources: [{ id: 'run-0', label: 'Simulation 1' }],
  selectedSourceIds: ['run-0'],
  variables: [],
  isLoaded: false,
  ...changes,
});

module('Integration | Component | chart-editor-sidebar', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'de-de');

  hooks.beforeEach(function (this: Context) {
    this.expanded = [];
    this.noop = () => {};
    this.onExpandResult = (resultId) => this.expanded.push(resultId);
  });

  const renderSidebar = () =>
    render(hbs`
      <ChartEditorSidebar
        @open={{true}}
        @results={{this.results}}
        @currentResultId="current"
        @tightYAxis={{false}}
        @onToggleTightYAxis={{this.noop}}
        @onToggleSidebar={{this.noop}}
        @onToggleVariable={{this.noop}}
        @onChangeSources={{this.noop}}
        @onExpandResult={{this.onExpandResult}}
      />
    `);

  test('the result the chart was opened from starts expanded with its outputs', async function (this: Context, assert) {
    this.results = [
      result('current', {
        isLoaded: true,
        variables: [{ name: 'Bevölkerung', selected: true }],
      }),
      result('other'),
    ];
    await renderSidebar();

    assert.dom('.chart-editor-result__panel').exists({ count: 1 });
    assert.dom('.chart-editor-variable').hasText('Bevölkerung');
    assert.deepEqual(this.expanded, [], 'nothing to load');
  });

  test('expanding another result asks for its data and shows it is loading', async function (this: Context, assert) {
    this.results = [result('current', { isLoaded: true }), result('other')];
    await renderSidebar();

    await click('.chart-editor-result:nth-child(2) .chart-editor-result__header');

    assert.deepEqual(this.expanded, ['other']);
    assert
      .dom('.chart-editor-result:nth-child(2) .chart-editor-result__panel')
      .hasText('Ergebnis wird geladen…');

    await click('.chart-editor-result:nth-child(2) .chart-editor-result__header');
    assert.deepEqual(this.expanded, ['other'], 'collapsing loads nothing');
  });

  test('a result that failed to load says so', async function (this: Context, assert) {
    this.results = [result('current', { loadFailed: true })];
    await renderSidebar();

    assert
      .dom('.chart-editor-result__panel')
      .hasText('Das Ergebnis konnte nicht geladen werden.');
  });
});
