import EmberRouter from '@ember/routing/router';
import config from 'hcu-urban-model-builder-client/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('authenticated', { path: '/' }, function () {
    this.route('models', { resetNamespace: true }, function () {
      this.route('show', { path: '/:id' });
    });
  });
});
