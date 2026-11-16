import { module, test } from 'qunit';
import { setupRenderingTest } from 'hcu-urban-model-builder-client/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupIntl } from 'ember-intl/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

class SessionStub extends Service {
  @tracked isAuthenticated = false;
  data = { authenticated: { userinfo: { name: 'Rosa Hansen' } } };
}

module('Integration | Component | app-rail', function (hooks) {
  setupRenderingTest(hooks);
  setupIntl(hooks, 'en-us');

  hooks.beforeEach(function () {
    this.owner.register('service:session', SessionStub);
    this.owner.setupRouter();
    this.set('logout', () => {});
  });

  hooks.afterEach(function () {
    window.localStorage.removeItem('theme');
    document.documentElement.removeAttribute('data-bs-theme');
  });

  test('visitors get Log in instead of the Library', async function (assert) {
    await render(hbs`<AppRail @onLogout={{this.logout}} />`);

    assert.dom('.umb-rail').includesText('Login');
    assert.dom('.umb-rail').doesNotIncludeText('Models');
    assert.dom('.umb-avatar').doesNotExist();
  });

  test('signed-in users get the Library and their account menu', async function (assert) {
    const session = this.owner.lookup('service:session') as SessionStub;
    session.isAuthenticated = true;
    let loggedOut = false;
    this.set('logout', () => (loggedOut = true));

    await render(hbs`<AppRail @onLogout={{this.logout}} />`);

    assert.dom('.umb-rail').includesText('Models');
    assert.dom('.umb-rail').includesText('Public');
    assert.dom('.umb-avatar').hasText('RH');

    await click('.umb-rail .dropdown-toggle');
    await click('.umb-rail .dropdown-menu button');
    assert.true(loggedOut);
  });

  test('the theme switch turns Night on and off', async function (assert) {
    await render(hbs`<AppRail @onLogout={{this.logout}} />`);
    const button = '.umb-rail button[aria-pressed]';

    assert.dom(button).hasAria('pressed', 'false');
    await click(button);
    assert.dom(button).hasAria('pressed', 'true');
    assert.strictEqual(
      document.documentElement.getAttribute('data-bs-theme'),
      'dark',
    );
  });
});
