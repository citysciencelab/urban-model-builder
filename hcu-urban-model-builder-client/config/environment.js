'use strict';

module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'hcu-urban-model-builder-client',
    environment,
    rootURL: '/',
    locationType: 'history',
    EmberENV: {
      EXTEND_PROTOTYPES: false,
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    },
    'ember-simple-auth': {
      routeAfterAuthentication: 'authenticated.index',
    },
    'ember-simple-auth-oidc': {
      host: 'http://localhost:8081/realms/hcu-model-builder/protocol/openid-connect',
      clientId: 'hcu-model-builder-server',
      authEndpoint: '/auth',
      tokenEndpoint: '/token',
      userinfoEndpoint: '/userinfo',
      endSessionEndpoint: '/logout',
      afterLogoutUri: 'http://localhost:4200',
      enablePkce: true,
      registrationEndpoint: 'registrations',
    },
  };

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  if (environment === 'production') {
    // here you can enable a production-specific feature
  }

  return ENV;
};
