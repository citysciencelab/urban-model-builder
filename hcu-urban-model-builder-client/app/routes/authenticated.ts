import Route from '@ember/routing/route';
import type EmberRouter from '@ember/routing/router';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';

export default class ProtectedRoute extends Route {
  @service session!: any;
  @service declare router: EmberRouter;

  async beforeModel(transition: Transition) {
    await this.session.requireAuthentication(transition, 'authenticate');
  }
}
