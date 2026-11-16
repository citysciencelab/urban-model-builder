import { module, test } from 'qunit';
import { setupTest } from 'hcu-urban-model-builder-client/tests/helpers';
import type ThemeService from 'hcu-urban-model-builder-client/services/theme';

module('Unit | Service | theme', function (hooks) {
  setupTest(hooks);

  hooks.afterEach(function () {
    window.localStorage.removeItem('theme');
    document.documentElement.removeAttribute('data-bs-theme');
  });

  test('Paper is the default, Night is opt-in and remembered', function (assert) {
    const service = this.owner.lookup('service:theme') as ThemeService;
    const root = document.documentElement;

    service.setup();
    assert.strictEqual(root.getAttribute('data-bs-theme'), 'light');

    service.toggle();
    assert.true(service.isDark);
    assert.strictEqual(root.getAttribute('data-bs-theme'), 'dark');
    assert.strictEqual(window.localStorage.getItem('theme'), 'dark');

    service.setup();
    assert.true(service.isDark, 'the stored theme is applied on boot');

    service.toggle();
    assert.strictEqual(root.getAttribute('data-bs-theme'), 'light');
  });
});
