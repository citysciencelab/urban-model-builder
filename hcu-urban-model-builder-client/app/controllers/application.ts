// app/controllers/application.js
import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type RouterService from '@ember/routing/router-service';

export default class ApplicationController extends Controller {
  @service session: any;
  @service feathers!: FeathersService;
  @service declare router: RouterService;

  get isDemoRoute() {
    return this.router.currentRouteName?.startsWith('demo');
  }

  get hasSecondaryNav() {
    return this.session.isAuthenticated || this.isDemoRoute;
  }

  @action
  invalidateSession() {
    this.session.singleLogout();
    this.feathers.app.logout();
  }
}
