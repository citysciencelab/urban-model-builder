import EmberRouter from '@ember/routing/router';
import config from 'hcu-urban-model-builder-client/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('authenticate');
  this.route('authenticated', function () {
    this.route('models', { resetNamespace: true }, function () {
      this.route('versions', { path: '/:id' }, function () {
        this.route('show', { path: '/version/:version_id' });
      });
    });
    this.route('public-models', { resetNamespace: true });
  });
  this.route('login');
  this.route('/');
  this.route('demo');
  // catch all 404 handling
  this.route('not-found', { path: '*path' });
  this.route('not-found');
  this.route('impressum');
  this.route('datenschutz');
  this.route('nutzungsbedingungen');
});
