import Route from '@ember/routing/route';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import type Store from '@ember-data/store';
import type Controller from '@ember/controller';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';

export default class PublicModelsRoute extends Route {
  controllerName = 'models.index';

  @service declare store: Store;

  queryParams = {
    sort_key: {
      refreshModel: true,
    },
    sort_direction: {
      refreshModel: true,
      type: 'number' as const,
    },
    limit: {
      refreshModel: true,
      type: 'number' as const,
    },
    page: {
      refreshModel: true,
      type: 'number' as const,
    },
    q: {
      refreshModel: true,
    },
  };

  async model(params: {
    sort_key: string;
    sort_direction: number;
    page: number;
    limit: number;
    q: string;
  }) {
    (this.store as any).storeEventEmitter.on(
      'model',
      'created',
      this.onCreated,
    );

    const query: any = {
      $skip: (params.page - 1) * params.limit,
      $limit: params.limit,
      $public: true,
    };

    if (params.sort_key) {
      query['$sort'] = {};
      query['$sort'][params.sort_key] = params.sort_direction;
    }

    if (params.q && params.q !== '') {
      query['internalName'] = {
        $ilike: `%${params.q}%`,
      };
    }

    return this.store.query('model', query);
  }

  setupController(controller: Controller, model: ModelModel[]) {
    // let modelsController = this.controllerFor('models/index');
    controller.set('model', model);
    // this.controller = modelsController;
  }

  @action
  onCreated() {
    this.refresh();
  }

  @action
  willTransition() {
    (this.store as any).storeEventEmitter.off(
      'model',
      'created',
      this.onCreated,
    );
  }
}
