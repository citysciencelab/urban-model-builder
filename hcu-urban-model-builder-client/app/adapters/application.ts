import Adapter from '@ember-data/adapter';
import type { AdapterPayload } from '@ember-data/legacy-compat/legacy-network-handler/minimum-adapter-interface';
import type { Snapshot } from '@ember-data/legacy-compat/legacy-network-handler/snapshot';
import type { Store } from '@ember-data/store/-private/store-service';
import type { ModelSchema } from '@ember-data/store/-types/q/ds-model';
import { service } from '@ember/service';
import type { Params } from '@feathersjs/feathers';
import type { LegacyHasManyField } from '@warp-drive/core-types/schema/fields';
import type { AdapterHasManyQuery } from 'global';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';

export default class ApplicationAdapter extends Adapter {
  @service feathers!: FeathersService;
  @service session!: any;

  async findAll(store: Store, type: ModelSchema): Promise<AdapterPayload> {
    return this.query(store, type, {});
  }

  async query(
    store: Store,
    type: ModelSchema,
    query: any,
  ): Promise<AdapterPayload> {
    return this.feathers.app
      .service(this.feathers.getServiceNameByModelName(type.modelName))
      .find({ query } as Params);
  }

  async findRecord(
    store: Store,
    type: ModelSchema,
    id: string,
  ): Promise<AdapterPayload> {
    return this.feathers.app
      .service(this.feathers.getServiceNameByModelName(type.modelName))
      .get(id);
  }

  async createRecord(
    store: Store,
    type: ModelSchema,
    snapshot: Snapshot<any>,
  ): Promise<AdapterPayload> {
    const data = this.serialize(snapshot, {});

    this.feathers.app.service('edges').find();

    return this.feathers.app
      .service(this.feathers.getServiceNameByModelName(type.modelName))
      .create(data);
  }

  async updateRecord(
    store: Store,
    type: ModelSchema,
    snapshot: Snapshot,
  ): Promise<AdapterPayload> {
    const data = this.serialize(snapshot, {});
    return this.feathers.app
      .service(this.feathers.getServiceNameByModelName(type.modelName))
      .patch(snapshot.id, data);
  }

  async deleteRecord(
    store: Store,
    type: ModelSchema,
    snapshot: Snapshot,
  ): Promise<AdapterPayload> {
    return this.feathers.app
      .service(this.feathers.getServiceNameByModelName(type.modelName))
      .remove(snapshot.id);
  }

  async findHasMany(
    _store: Store,
    _snapshot: Snapshot,
    _url: string,
    type: LegacyHasManyField & {
      options: { sortField?: string; sortDirection?: 1 | -1 };
    },
  ) {
    const query: AdapterHasManyQuery = {
      [`${type.options.inverse}Id`]: _snapshot.id!,
    };

    if (type.options.sortField) {
      const sortDirection = type.options.sortDirection || 1;
      query.$sort = {
        [type.options.sortField]: sortDirection,
      };
    }
    return this.feathers.app
      .service(this.feathers.getServiceNameByModelName(type.type))
      .find({
        query,
      });
  }
}
