import Service from '@ember/service';
import { service } from '@ember/service';
import { later, cancel } from '@ember/runloop';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type { Timer } from '@ember/runloop';

export default class TokenService extends Service {
  @service declare session: any;
  @service declare feathers: FeathersService;

  intervalId: Timer | null = null;

  async refreshToken() {
    if (!this.session.isAuthenticated) return;

    const tokenBefore = this.session.data.authenticated.access_token;
    if (!tokenBefore) return;

    await this.session.refreshAuthentication.perform();
    window.localStorage.setItem(
      'feathers-jwt',
      this.session.data.authenticated.access_token,
    );

    if (
      tokenBefore &&
      tokenBefore !== this.session.data.authenticated.access_token
    ) {
      await this.feathers.app.reAuthenticate(true, 'oidc');
    }
    this.intervalId = later(this, this.refreshToken, 1000 * 10);
  }

  startTokenRefresh() {
    this.stopTokenRefresh();
    this.refreshToken();
  }

  stopTokenRefresh() {
    if (this.intervalId) {
      cancel(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:token')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('token') declare altName: TokenService;`.
declare module '@ember/service' {
  interface Registry {
    token: TokenService;
  }
}
