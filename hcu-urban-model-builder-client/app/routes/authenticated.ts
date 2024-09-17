import Route from '@ember/routing/route';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';

export default class ProtectedRoute extends Route {
  @service session!: any;

  async beforeModel(transition: Transition) {
    await this.session.requireAuthentication(transition, 'authenticate');
  }
}
