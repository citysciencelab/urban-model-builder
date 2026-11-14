import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type RouterService from '@ember/routing/router-service';

// Routes that show the modelling canvas. They have no rail: the canvas fills
// the window and the title block leads back to the Library.
const EDITOR_ROUTES = ['models.versions.show', 'demo'];

export default class ApplicationController extends Controller {
  @service session: any;
  @service feathers!: FeathersService;
  @service router!: RouterService;

  get isEditor() {
    const routeName = this.router.currentRouteName ?? '';
    return EDITOR_ROUTES.some((name) => routeName.startsWith(name));
  }

  @action
  invalidateSession() {
    this.session.singleLogout();
    this.feathers.app.logout();
  }
}
