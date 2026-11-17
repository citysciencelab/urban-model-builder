import { module, test } from 'qunit';
import { click, currentURL, fillIn, visit, waitFor } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import { setupApplicationTest } from 'hcu-urban-model-builder-client/tests/helpers';

// the routes for signed-in users are nested under /authenticated
const URL = '/authenticated/access-tokens';
const NEW_TOKEN = 'umb_pat_Zm9vYmFyZm9vYmFyZm9vYmFyZm9vYmFyZm9vYmFyZm9vYmE';

/** Stands in for the backend's `access-tokens` service. */
class FeathersStub extends Service {
  tokens = [
    {
      id: 't1',
      name: 'Claude Desktop',
      tokenPrefix: 'umb_pat_Ab12Cd',
      createdAt: '2026-11-01T10:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      lastUsedAt: null,
    },
  ];
  created: unknown[] = [];

  authenticate() {}

  app = {
    // connection events the app subscribes to
    on: () => {},
    off: () => {},
    service: () => ({
      find: async () => ({ data: this.tokens, total: this.tokens.length }),
      create: async (data: { name: string }) => {
        this.created.push(data);
        return {
          id: 't2',
          name: data.name,
          tokenPrefix: NEW_TOKEN.slice(0, 14),
          createdAt: new Date().toISOString(),
          expiresAt: '2099-01-01T00:00:00.000Z',
          lastUsedAt: null,
          token: NEW_TOKEN,
        };
      },
      remove: async (id: string) => ({ id }),
    }),
  };
}

class TokenStub extends Service {
  startTokenRefresh() {}
  stopTokenRefresh() {}
}

module('Acceptance | access tokens', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(async function () {
    this.owner.register('service:feathers', FeathersStub);
    this.owner.register('service:token', TokenStub);
    await authenticateSession({ userinfo: { name: 'Rosa Hansen' } });
  });

  test('lists tokens and shows the connection details', async function (assert) {
    await visit(URL);

    assert.strictEqual(currentURL(), URL);
    // the application sets the locale itself, so the expected text is looked up
    const intl = this.owner.lookup('service:intl') as IntlService;
    assert.dom('h1').hasText(intl.t('routes.access_tokens.title'));
    assert.dom('[data-test-endpoint]').includesText('/mcp');
    assert.dom('[data-test-token-row]').exists({ count: 1 });
    assert.dom('[data-test-token-row]').includesText('Claude Desktop');
    assert.dom('[data-test-token-row]').includesText('umb_pat_Ab12Cd…');
    assert.dom('[data-test-new-token]').doesNotExist();
    assert.dom('.umb-access').includesText('<YOUR_TOKEN>');
    // the page uses the app rail of the design system
    assert.dom('.umb-rail').exists();
  });

  test('a new token is shown once and used in the examples', async function (assert) {
    await visit(URL);
    assert.dom('button[type="submit"]').isDisabled();

    await fillIn('#access-tokens-name', 'Claude Code');
    await click('button[type="submit"]');

    const feathers = this.owner.lookup('service:feathers') as FeathersStub;
    assert.deepEqual(feathers.created, [
      { name: 'Claude Code', expiresInDays: 90 },
    ]);
    assert.dom('[data-test-new-token]').includesText(NEW_TOKEN);
    assert.dom('[data-test-token-row]').exists({ count: 2 });
    assert.dom('.umb-access').doesNotIncludeText('<YOUR_TOKEN>');
    assert.dom('#access-tokens-name').hasValue('');

    await visit('/impressum');
    await visit(URL);
    assert.dom('[data-test-new-token]').doesNotExist();
  });

  test('explains signing in when the server offers it', async function (assert) {
    await visit(URL);
    assert.dom('[data-test-oauth]').doesNotExist();
    assert.dom('[data-test-no-oauth]').exists();

    const originalFetch = window.fetch;
    window.fetch = async () =>
      new Response(
        JSON.stringify({ resource: 'https://api.example.org/mcp' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    try {
      await visit('/impressum');
      await visit(URL);
      await waitFor('[data-test-oauth]');

      assert.dom('[data-test-endpoint]').hasText('https://api.example.org/mcp');
      assert.dom('[data-test-no-oauth]').doesNotExist();
    } finally {
      window.fetch = originalFetch;
    }
  });

  test('a token can be revoked', async function (assert) {
    const confirm = window.confirm;
    window.confirm = () => true;
    try {
      await visit(URL);
      await click('[data-test-token-row] button');

      assert.dom('[data-test-token-row]').doesNotExist();
      assert.dom('[data-test-no-tokens]').exists();
    } finally {
      window.confirm = confirm;
    }
  });
});
