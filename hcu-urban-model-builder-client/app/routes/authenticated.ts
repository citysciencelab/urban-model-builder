import Route from '@ember/routing/route';
import type EmberRouter from '@ember/routing/router';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type TokenService from 'hcu-urban-model-builder-client/services/token';

export default class ProtectedRoute extends Route {
  @service session!: any;
  @service declare router: EmberRouter;
  @service declare token: TokenService;
  @service declare feathers: FeathersService;

  async beforeModel(transition: Transition) {
    if (await this.session.requireAuthentication(transition, 'login')) {
      this.feathers.authenticate();
      this.token.startTokenRefresh();
    }
  }

  async willDestroy() {
    super.willDestroy();
    this.token.stopTokenRefresh();
  }
}
