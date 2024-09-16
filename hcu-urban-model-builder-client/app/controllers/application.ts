// app/controllers/application.js
import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';

export default class ApplicationController extends Controller {
  @service session: any;
  @service feathers!: FeathersService;

  @action
  invalidateSession() {
    this.session.singleLogout();
    this.feathers.app.logout();
  }
}
