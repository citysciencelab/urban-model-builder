import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';

export default class ApplicationRoute extends Route {
  @service declare router: RouterService;

  beforeModel(transition: Transition) {
    if (transition.to?.name === 'authenticated.index') {
      this.router.replaceWith('models');
    }
  }
}
