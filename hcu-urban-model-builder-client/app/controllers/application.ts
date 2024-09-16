// app/controllers/application.js
import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
  @service session: any;

  @action
  invalidateSession() {
    //this.session.invalidate();
    this.session.singleLogout();
  }
}
