import type RouterService from '@ember/routing/router-service';
import Service from '@ember/service';
import { service } from '@ember/service';

export default class ApplicationStateService extends Service {
  @service declare router: RouterService;

  get isDemoMode() {
    return this.router.currentRouteName?.startsWith('demo');
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:application-state')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('application-state') declare altName: ApplicationStateService;`.
declare module '@ember/service' {
  interface Registry {
    'application-state': ApplicationStateService;
  }
}
