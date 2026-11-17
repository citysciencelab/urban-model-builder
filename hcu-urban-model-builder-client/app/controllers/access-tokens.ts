import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type IntlService from 'ember-intl/services/intl';
import ENV from 'hcu-urban-model-builder-client/config/environment';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';

/** An access token as the `access-tokens` service returns it. `token` is only present right after creation. */
export interface AccessToken {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string | null;
  token?: string;
}

const TOKEN_PLACEHOLDER = '<YOUR_TOKEN>';
const SERVER_NAME = 'urban-model-builder';

export default class AccessTokensController extends Controller {
  @service declare feathers: FeathersService;
  @service declare intl: IntlService;

  @tracked tokens: AccessToken[] = [];
  @tracked name = '';
  @tracked expiresInDays = 90;
  @tracked createdToken: string | null = null;
  @tracked isSaving = false;
  @tracked hasError = false;
  /** Which of the copyable texts was copied last, to confirm it next to its button. */
  @tracked copiedKey: string | null = null;

  lifetimes = [30, 90, 365];

  /**
   * The MCP endpoint as the server announces it, if the server lets programs sign users in (OAuth).
   * Null if only access tokens are accepted.
   */
  @tracked oauthResource: string | null = null;

  get mcpUrl() {
    return this.oauthResource ?? `${ENV.apiURL}/mcp`;
  }

  /** Asks the server whether programs can sign users in themselves, which makes tokens unnecessary for them. */
  async checkOAuth() {
    try {
      const response = await fetch(
        `${ENV.apiURL}/.well-known/oauth-protected-resource/mcp`,
      );
      const metadata = response.ok ? await response.json() : null;
      this.oauthResource =
        typeof metadata?.resource === 'string' ? metadata.resource : null;
    } catch {
      this.oauthResource = null;
    }
  }

  get rows() {
    const now = Date.now();
    return this.tokens.map((token) => ({
      token,
      maskedToken: `${token.tokenPrefix}…`,
      isExpired: new Date(token.expiresAt).getTime() <= now,
    }));
  }

  get canCreate() {
    return this.name.trim().length > 0 && !this.isSaving;
  }

  /** The examples contain the new token while it is visible, so that they can be used as they are. */
  get tokenForExamples() {
    return this.createdToken ?? TOKEN_PLACEHOLDER;
  }

  get claudeCodeCommand() {
    return `claude mcp add --transport http ${SERVER_NAME} ${this.mcpUrl} --header "Authorization: Bearer ${this.tokenForExamples}"`;
  }

  get jsonConfig() {
    return JSON.stringify(
      {
        mcpServers: {
          [SERVER_NAME]: {
            type: 'http',
            url: this.mcpUrl,
            headers: { Authorization: `Bearer ${this.tokenForExamples}` },
          },
        },
      },
      null,
      2,
    );
  }

  @action onNameInput(event: Event) {
    this.name = (event.target as HTMLInputElement).value;
  }

  @action onLifetimeChange(event: Event) {
    this.expiresInDays = Number((event.target as HTMLSelectElement).value);
  }

  @action async createToken(event: Event) {
    event.preventDefault();
    if (!this.canCreate) {
      return;
    }
    this.isSaving = true;
    this.hasError = false;
    try {
      const { token, ...record } = (await this.feathers.app
        .service('access-tokens')
        .create({
          name: this.name.trim(),
          expiresInDays: this.expiresInDays,
        })) as AccessToken;
      this.tokens = [record, ...this.tokens];
      this.createdToken = token ?? null;
      this.name = '';
    } catch (error) {
      console.error(error);
      this.hasError = true;
    } finally {
      this.isSaving = false;
    }
  }

  @action async revokeToken(token: AccessToken) {
    const question = this.intl.t('routes.access_tokens.confirm_revoke', {
      name: token.name,
    });
    if (!window.confirm(question)) {
      return;
    }
    this.hasError = false;
    try {
      await this.feathers.app.service('access-tokens').remove(token.id);
      this.tokens = this.tokens.filter((other) => other.id !== token.id);
    } catch (error) {
      console.error(error);
      this.hasError = true;
    }
  }

  @action async copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    this.copiedKey = key;
  }
}
