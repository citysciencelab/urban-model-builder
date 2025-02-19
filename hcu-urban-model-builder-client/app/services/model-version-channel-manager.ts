import type Owner from '@ember/owner';
import Service from '@ember/service';
import type FeathersService from './feathers';
import { service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import type { RouteInfoWithAttributes } from '@ember/routing/route-info';
import type RouteInfo from '@ember/routing/route-info';

export default class ModelVersionChannelManagerService extends Service {
  @service declare feathers: FeathersService;
  @service declare router: RouterService;

  constructor(owner: Owner) {
    super(owner);
  }

  listen() {
    this.router.on('routeDidChange', this.onRouteDidChange.bind(this));
    this.feathers.app.on('authenticated', this.onAuthenticated.bind(this));
  }

  private async onRouteDidChange(transition: Transition) {
    if (this.isModelVersionRoute(transition.from)) {
      await this.leaveChannel(transition.from);
    }
    if (this.isModelVersionRoute(transition.to)) {
      await this.joinChannel(transition.to);
    }
  }

  private async onAuthenticated() {
    if (this.isModelVersionRoute(this.router.currentRoute)) {
      await this.joinChannel(this.router.currentRoute);
    }
  }

  private getModelVersionId(routeInfo: RouteInfo | RouteInfoWithAttributes) {
    return 'attributes' in routeInfo
      ? routeInfo.attributes.id
      : routeInfo.params?.['version_id'];
  }

  private async joinChannel(routeInfo: RouteInfo | RouteInfoWithAttributes) {
    const modelVersionId = this.getModelVersionId(routeInfo);

    await this.feathers.app
      .service('models-versions')
      .joinChannel({ id: modelVersionId });
  }

  private async leaveChannel(routeInfo: RouteInfo | RouteInfoWithAttributes) {
    const modelVersionId = this.getModelVersionId(routeInfo);

    await this.feathers.app
      .service('models-versions')
      .leaveChannel({ id: modelVersionId });
  }

  private isModelVersionRoute(
    routeInfo: RouteInfo | RouteInfoWithAttributes | null | void | undefined,
  ): routeInfo is RouteInfo | RouteInfoWithAttributes {
    return !!(routeInfo && routeInfo.name === 'models.versions.show');
  }

  willDestroy(): void {
    this.router.off('routeDidChange', this.onRouteDidChange);
    this.feathers.app.off('authenticated', this.onAuthenticated);
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:model-version-channel-manager')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('model-version-channel-manager') declare altName: ModelVersionChannelManagerService;`.
declare module '@ember/service' {
  interface Registry {
    'model-version-channel-manager': ModelVersionChannelManagerService;
  }
}
