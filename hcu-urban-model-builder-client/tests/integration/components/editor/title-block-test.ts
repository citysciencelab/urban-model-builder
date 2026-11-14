import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import type Store from '@ember-data/store';
import type SaveStatusService from 'hcu-urban-model-builder-client/services/save-status';
import { pushModel } from 'hcu-urban-model-builder-client/tests/helpers/library';

module('Integration | Component | editor/title-block', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  hooks.beforeEach(function () {
    this.owner.setupRouter();
  });

  test('it names the model and follows the save status', async function (assert) {
    pushModel(this);
    const store = this.owner.lookup('service:store') as Store;
    const saveStatus = this.owner.lookup(
      'service:save-status',
    ) as SaveStatusService;
    this.set('version', store.peekRecord('models-version', 'm1-v'));

    await render(hbs`<Editor::TitleBlock @modelVersion={{this.version}} />`);

    assert.dom('.umb-titleblock__meta').includesText('v1.4.0');
    assert.dom('.umb-titleblock__meta').includesText('Draft');
    assert.dom('[data-test-save-status]').doesNotExist();
    assert.dom('[data-test-read-only]').doesNotExist();

    saveStatus.lastSavedAt = new Date(2026, 9, 19, 12, 41);
    await settled();
    assert.dom('[data-test-save-status="saved"]').includesText('12:41');

    saveStatus.hasError = true;
    await settled();
    assert.dom('[data-test-save-status="error"]').hasText('not saved');
  });

  test('a published version is read-only and shows no save status', async function (assert) {
    pushModel(this, { published: true });
    const store = this.owner.lookup('service:store') as Store;
    this.set('version', store.peekRecord('models-version', 'm1-v'));

    await render(hbs`<Editor::TitleBlock @modelVersion={{this.version}} />`);

    assert.dom('[data-test-read-only]').exists();
    assert.dom('.umb-titleblock__meta').includesText('Published');
    assert.dom('[data-test-save-status]').doesNotExist();
  });
});
