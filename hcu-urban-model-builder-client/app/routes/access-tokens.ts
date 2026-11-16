import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type AccessTokensController from 'hcu-urban-model-builder-client/controllers/access-tokens';
import type { AccessToken } from 'hcu-urban-model-builder-client/controllers/access-tokens';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';

export default class AccessTokensRoute extends Route {
  @service declare feathers: FeathersService;

  async model() {
    const result = await this.feathers.app
      .service('access-tokens')
      .find({ query: { $sort: { createdAt: -1 } } });
    return result.data as AccessToken[];
  }

  setupController(controller: AccessTokensController, model: AccessToken[]) {
    super.setupController(controller, model);
    controller.tokens = model;
    // a token is shown once: it must not reappear when the page is visited again
    controller.createdToken = null;
  }
}
