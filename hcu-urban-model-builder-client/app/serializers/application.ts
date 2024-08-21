import type Model from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';
import type Store from '@ember-data/store';
import type { ModelSchema } from '@ember-data/store/types';
import type { Paginated } from '@feathersjs/feathers';

export default class ApplicationSerializer extends JSONSerializer {
  normalizeResponse(
    _store: Store,
    primaryModelClass: ModelSchema,
    payload: Record<string, unknown> | Paginated<Record<string, unknown>>,
    _id: string | number,
    requestType: string,
  ) {
    let items;
    const documentHash: any = {
      data: null,
      included: [],
    };

    let isSingleItem;

    if ('data' in payload && Array.isArray(payload.data)) {
      documentHash.meta = {
        skip: payload.skip,
        limit: payload.limit,
        total: payload.total,
      };
      items = payload.data;
      isSingleItem = false;
    } else {
      items = [payload];
      isSingleItem = true;
    }

    const ret = items.map((item) => {
      const { data, included } = this.normalize(primaryModelClass, item);
      if (included) {
        documentHash.included.push(...included);
      }

      return data;
    });

    documentHash.data = isSingleItem ? ret[0] : ret;

    if (requestType === 'queryRecord') {
      documentHash.data = ret[0];
    }

    return documentHash;
  }
}
