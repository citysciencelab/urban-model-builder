import { cached } from '@ember-data/tracking';
import { action, get } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { TrackedAsyncData } from 'ember-async-data';
import { task, timeout } from 'ember-concurrency';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type OgcApiFeaturesService from 'hcu-urban-model-builder-client/services/ogc-api-features';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
import { transformFeatures } from 'hcu-urban-model-builder-backend';
import { ValuePointer } from '@sinclair/typebox/value';

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
  readonly DEBOUNCE_MS = 250;

  @service declare ogcApiFeatures: OgcApiFeaturesService;

  @tracked showPreviewModal = false;
  @tracked jsonPointer = '';
  @tracked jsonPointerValue = '';

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

  @cached
  get currentQueryResult() {
    const fetch = async () => {
      const apiId = this.args.changeset.dataProxy.data.apiId;
      const collectionId = this.args.changeset.dataProxy.data.collectionId;
      const query = this.args.changeset.dataProxy.data.query;

      if (!apiId || !collectionId || !query) {
        return null;
      }

      return this.queryTask.perform(apiId, collectionId, {
        ...query,
        limit: 2,
      });
    };

    return new TrackedAsyncData(fetch());
  }

  get previewFeatures() {
    const features = this.currentQueryResult.value?.features ?? [];

    return transformFeatures(
      features,
      this.args.changeset.dataProxy.data.dataTransform?.keyProperty,
      this.args.changeset.dataProxy.data.dataTransform?.valueProperties,
      true,
    );
  }

  get numberOfAllMatchingFeatures() {
    return this.currentQueryResult.value?.numberMatched ?? null;
  }

  get numberOfCurrentMatchingFeatures() {
    if (
      this.numberOfAllMatchingFeatures === null ||
      this.args.changeset.dataProxy.data.query?.limit === undefined
    ) {
      return null;
    }

    return Math.min(
      this.numberOfAllMatchingFeatures,
      this.args.changeset.dataProxy.data.query?.limit,
    );
  }

  @action
  onApiSelected(api: NonNullable<this['availableApis']['value']>[number]) {
    this.args.changeset.dataProxy.data.apiId = api.id;
    delete this.args.changeset.dataProxy.data.collectionId;
    this.args.changeset.dataProxy.data = {
      ...this.args.changeset.dataProxy.data,
    };
    this.resetQuery();
  }

  @action
  onCollectionSelected(collection: { id: string }) {
    console.log('collection selected', collection);

    this.args.changeset.dataProxy.data.collectionId = collection.id;
    this.resetQuery();
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

  @action
  resetQuery() {
    const { limit, offset, skipGeometry } =
      this.args.changeset.dataProxy.data.query ?? {};
    this.args.changeset.dataProxy.data.query = {
      limit,
      offset,
      skipGeometry,
    };
  }

  queryTask = task(
    { restartable: true },
    async (apiId: string, collectionId: string, query: any) => {
      await timeout(this.DEBOUNCE_MS);

      return this.ogcApiFeatures.fetchFeatures(apiId, collectionId, query);
    },
  );
}
