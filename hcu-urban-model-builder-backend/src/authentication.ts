// For more information about this file see https://dove.feathersjs.com/guides/cli/authentication.html
import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { OidcStrategy } from 'feathers-authentication-oidc'

import type { Application } from './declarations.js'

declare module './declarations.js' {
  interface ServiceTypes {
    authentication: AuthenticationService
  }
}

export const authentication = (app: Application) => {
  const authentication = new AuthenticationService(app)

  authentication.register('oidc', new OidcStrategy())

  app.use('authentication', authentication)
}
