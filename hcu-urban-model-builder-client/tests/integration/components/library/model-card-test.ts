import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, find, render, waitFor, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import {
  pushModel,
  SD_GEO_NODES,
  stubNodesService,
} from 'hcu-urban-model-builder-client/tests/helpers/library';

module('Integration | Component | library/model-card', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  hooks.beforeEach(function () {
    this.owner.setupRouter();
    this.set('noop', () => {});
  });

  test('it shows a draft as a sheet with thumbnail, mix and meta', async function (assert) {
    const queries = stubNodesService(this, SD_GEO_NODES);
    this.set('model', pushModel(this));

    await render(
      hbs`<Library::ModelCard @model={{this.model}} @onEdit={{this.noop}} @onDelete={{this.noop}} />`,
    );

    await waitFor('.umb-thumb__node');

    assert.dom('.umb-card__title').hasText('Housing demand Hamburg 2040');
    assert.dom('[data-test-state="draft"]').hasText('Draft');
    assert.dom('.umb-thumb__node').exists({ count: 4 });
    assert.dom('.umb-thumb__node--stock').exists({ count: 2 });
    assert.dom('.umb-mix__segment').exists({ count: 3 });
    assert.dom('[data-test-mix-caption]').hasText('SD 75 % · GEO 25 %');
    assert
      .dom('[data-test-node-mix]')
      .hasAttribute(
        'aria-label',
        'Node mix: system dynamics 75 percent, geodata 25 percent',
        'the mix is never told by colour alone',
      );
    assert.dom('.umb-card').includesText('4 nodes');
    assert.dom('.umb-card').includesText('Owner');
    assert.deepEqual(
      queries.map((query) => query.modelsVersionsId),
      ['m1-v'],
      'one slim node query for the current version',
    );
  });

  test('a published version is a solid chip with its version', async function (assert) {
    stubNodesService(this, []);
    this.set('model', pushModel(this, { published: true, role: 0 }));

    await render(
      hbs`<Library::ModelCard @model={{this.model}} @onEdit={{this.noop}} @onDelete={{this.noop}} />`,
    );

    await waitUntil(() => find('[data-test-mix-caption]')?.textContent?.trim());

    assert.dom('[data-test-state="published"]').hasText('v1.4.0');
    assert.dom('[data-test-mix-caption]').hasText('No nodes yet');
    assert.dom('.umb-card').doesNotIncludeText('No authorization');
  });

  test('secondary actions sit in the menu', async function (assert) {
    stubNodesService(this, []);
    const model = pushModel(this);
    const edited: unknown[] = [];
    this.set('model', model);
    this.set('onEdit', (m: unknown) => edited.push(m));

    await render(
      hbs`<Library::ModelCard @model={{this.model}} @onEdit={{this.onEdit}} @onDelete={{this.noop}} />`,
    );
    await click('.umb-card__menu .dropdown-toggle');
    await click('.umb-card__menu .dropdown-menu button:not([disabled])');

    assert.deepEqual(edited, [model]);
  });
});
