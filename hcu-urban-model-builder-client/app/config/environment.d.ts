/**
 * Type declarations for
 *    import config from 'hcu-urban-model-builder-client/config/environment'
 */
declare const config: {
  environment: string;
  modulePrefix: string;
  podModulePrefix: string;
  locationType: 'history' | 'hash' | 'none';
  rootURL: string;
  apiURL: string;
  APP: Record<string, unknown>;
  'ember-simple-auth-oidc': Record<string, unknown>;
  'ember-simple-auth': Record<string, unknown>;
};

export default config;
