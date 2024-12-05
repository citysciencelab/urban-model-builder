import { cached } from '@ember-data/tracking';
import { action, set } from '@ember/object';
import { service } from '@ember/service';
import { isBlank } from '@ember/utils';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { TrackedAsyncData } from 'ember-async-data';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type OgcApiFeaturesService from 'hcu-urban-model-builder-client/services/ogc-api-features';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';

export interface NodeFormFieldsOgcApiFeaturesSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsOgcApiFeaturesComponent extends Component<NodeFormFieldsOgcApiFeaturesSignature> {
  @service declare ogcApiFeatures: OgcApiFeaturesService;

  @cached
  get availableApis() {
    return new TrackedAsyncData(this.ogcApiFeatures.getAvailableApis());
  }

  get selectedApi() {
    return (
      this.availableApis.value?.find(
        (api) => api.id === this.args.changeset.dataProxy.data.apiId,
      ) ?? null
    );
  }

  @cached
  get availableCollections() {
    const apiId = this.args.changeset.dataProxy.data.apiId;
    console.log('fetching collections for apiId', apiId);

    const fetch = async () => {
      if (!apiId) {
        return null;
      }

      return this.ogcApiFeatures.getAvailableCollections(apiId);
    };
    return new TrackedAsyncData(fetch());
  }

  get selectedCollection() {
    return (
      this.availableCollections.value?.find(
        (collection) =>
          collection.id === this.args.changeset.dataProxy.data.collectionId,
      ) ?? null
    );
  }

  @cached
  get isCollectionSelectDisabled() {
    return !(
      this.args.changeset.dataProxy.data.apiId &&
      this.availableCollections.isResolved
    );
  }

  @cached
  get propertiesSchema() {
    const apiId = this.args.changeset.dataProxy.data.apiId;
    const collectionId = this.args.changeset.dataProxy.data.collectionId;

    const fetch = async () => {
      if (!apiId || !collectionId) {
        return null;
      }

      const properties = await this.ogcApiFeatures.getPropertiesSchema(
        apiId,
        collectionId,
      );

      return Object.entries(properties).map(([id, property]) => ({
        id: id,
        ...property,
      }));
    };
    return new TrackedAsyncData(fetch());
  }

  get selectedProperties() {
    if (!this.propertiesSchema.value) {
      return [];
    }
    return (
      this.args.changeset.dataProxy.data.query?.['properties']?.map((id) =>
        this.propertiesSchema.value!.find((property) => property.id === id),
      ) ?? []
    );
  }

  @action
  onApiSelected(api: NonNullable<this['availableApis']['value']>[number]) {
    this.args.changeset.dataProxy.data.apiId = api.id;
    delete this.args.changeset.dataProxy.data.collectionId;
  }

  @action
  onCollectionSelected(collection: { id: string }) {
    console.log('collection selected', collection);

    this.args.changeset.dataProxy.data.collectionId = collection.id;
    const { limit, offset, skipGeometry } =
      this.args.changeset.dataProxy.data.query ?? {};
    this.args.changeset.dataProxy.data.query = {
      limit,
      offset,
      skipGeometry,
    };
  }

  @action
  toggleSkipGeometry() {
    const data = this.args.changeset.dataProxy.data;
    if (!data.query) {
      data.query = { skipGeometry: true };
    } else {
      data.query.skipGeometry = !data.query.skipGeometry;
    }
  }

  @action
  onPropertiesSelected(property: { id: string }[]) {
    this.args.changeset.dataProxy.data.query!.properties = property.map(
      (p) => p.id,
    );
  }
}
