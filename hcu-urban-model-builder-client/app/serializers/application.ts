import type { Snapshot } from '@ember-data/legacy-compat/-private';
import JSONSerializer from '@ember-data/serializer/json';
import type Store from '@ember-data/store';
import type { ModelSchema } from '@ember-data/store/types';
import type { Paginated } from '@feathersjs/feathers';
import type {
  SingleResourceDocument,
  EmptyResourceDocument,
} from '@warp-drive/core-types/spec/json-api-raw';

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

  /**
   * Copy of the original method from JSONSerializer
   */
  serializeBelongsTo(
    snapshot: Snapshot,
    json: Record<string, any>,
    relationship: any,
  ) {
    const name = relationship.name;

    if ((this as any)._canSerialize(name)) {
      const belongsToId = snapshot.belongsTo(name, { id: true });

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      const schema = this.store.modelFor(snapshot.modelName);
      let payloadKey = (this as any)._getMappedKey(name, schema);
      if (payloadKey === name && this.keyForRelationship) {
        payloadKey = this.keyForRelationship(name, 'belongsTo', 'serialize');
      }

      //Need to check whether the id is there for new&async records
      if (!belongsToId) {
        json[payloadKey] = null;
      } else {
        json[payloadKey] = Number(belongsToId);
      }

      if (relationship.options.polymorphic) {
        (this as any).serializePolymorphicType(snapshot, json, relationship);
      }
    }
  }

  normalize(
    _typeClass: ModelSchema,
    hash: Record<string, unknown>,
  ): SingleResourceDocument | EmptyResourceDocument {
    this.normalizeHasMany(_typeClass, hash);
    return super.normalize(_typeClass, hash);
  }

  normalizeHasMany(primaryModelClass: any, hash: any) {
    if (!('links' in hash)) {
      hash.links = {};
    }

    for (const hasManyRelationshipName of primaryModelClass.relationshipNames
      .hasMany) {
      // if the hasMany relationship key is not included in the hash then skip because data is embedded
      if (
        !(hasManyRelationshipName in hash) &&
        !(hasManyRelationshipName in hash.links)
      ) {
        hash.links[hasManyRelationshipName] = 'async-has-many';
      }
    }

    return hash;
  }

  keyForRelationship(key: string, typeClass: string, method: string) {
    if (
      (method === 'serialize' || method === 'deserialize') &&
      typeClass === 'belongsTo'
    ) {
      return `${key}Id`;
    }
    return key;
  }
}
