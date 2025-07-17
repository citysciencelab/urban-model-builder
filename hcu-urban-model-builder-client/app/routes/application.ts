import type Owner from '@ember/owner';
import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';
import type ModelVersionChannelManagerService from 'hcu-urban-model-builder-client/services/model-version-channel-manager';
import { action } from '@ember/object';

export default class ApplicationRoute extends Route {
  @service declare router: RouterService;
  @service declare session: any;
  @service declare intl: any;
  @service
  declare modelVersionChannelManager: ModelVersionChannelManagerService;

  constructor(owner?: Owner) {
    super(owner);
    this.modelVersionChannelManager.listen();

  }

  async beforeModel(transition: Transition) {
    await this.session.setup();

    const storedLocale = localStorage.getItem('locale');
    const locale = storedLocale || 'de-de';
    this.intl.setLocale([locale]);

    if (transition.to?.name === 'authenticated.index') {
      this.router.replaceWith('models');
    }
  }

  @action
  error(err: any) {
    if (err.code === 404) {
      this.router.transitionTo('not-found');
      return false;
    }
  }
}
