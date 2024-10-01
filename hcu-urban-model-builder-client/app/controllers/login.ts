import Controller from '@ember/controller';
import ENV from 'hcu-urban-model-builder-client/config/environment';

export default class LoginController extends Controller {
  get registrationUrl() {
    const { protocol, host } = location;
    const {
      clientId,
      host: authHost,
      registrationEndpoint,
    } = ENV['ember-simple-auth-oidc'];

    const bodyObject: { [key: string]: string } = {
      response_type: 'none',
      client_id: clientId as string,
      redirect_uri: `${protocol}//${host}/authenticate`,
    };

    const body = Object.keys(bodyObject)
      .map((k) => `${k}=${encodeURIComponent(bodyObject[k] ?? '')}`)
      .join('&');

    return `${authHost}/${registrationEndpoint}?${body}`;
  }
}
