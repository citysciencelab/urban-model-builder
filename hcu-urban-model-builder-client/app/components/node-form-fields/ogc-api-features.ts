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
import {
  GEOMETRY_KEY,
  transformFeatures,
  type Nodes,
} from 'hcu-urban-model-builder-backend';

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

  get nodeData() {
    return this.args.changeset.dataProxy.data;
  }

  set nodeData(data: Nodes['data']) {
    this.args.changeset.dataProxy.data = data;
  }

  @cached
  get availableApis() {
    return new TrackedAsyncData(this.ogcApiFeatures.getAvailableApis());
  }

  get selectedApi() {
    return (
      this.availableApis.value?.find((api) => api.id === this.nodeData.apiId) ??
      null
    );
  }

  @cached
  get availableCollections() {
    const apiId = this.nodeData.apiId;

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
        (collection) => collection.id === this.nodeData.collectionId,
      ) ?? null
    );
  }

  @cached
  get isCollectionSelectDisabled() {
    return !(this.nodeData.apiId && this.availableCollections.isResolved);
  }

  @cached
  get propertiesSchema() {
    const apiId = this.nodeData.apiId;
    const collectionId = this.nodeData.collectionId;

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
      this.nodeData.query?.['properties']?.map((id) =>
        this.propertiesSchema.value!.find((property) => property.id === id),
      ) ?? []
    );
  }

  @cached
  get currentQueryResult() {
    const fetch = async () => {
      const apiId = this.nodeData.apiId;
      const collectionId = this.nodeData.collectionId;
      const query = this.nodeData.query;

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
      this.nodeData.dataTransform?.keyProperty,
      this.nodeData.dataTransform?.valueProperties,
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
      this.nodeData.query?.limit ?? 0,
    );
  }

  @action
  onApiSelected(api: NonNullable<this['availableApis']['value']>[number]) {
    this.nodeData.apiId = api.id;
    delete this.nodeData.collectionId;
    this.nodeData = {
      ...this.nodeData,
    };
    this.resetQuery();
  }

  @action
  onCollectionSelected(collection: { id: string }) {
    this.nodeData.collectionId = collection.id;
    this.resetQuery();
  }

  @action
  toggleSkipGeometry() {
    const data = this.nodeData;
    if (!data.query) {
      data.query = { skipGeometry: true };
    } else {
      data.query.skipGeometry = !data.query.skipGeometry;
      this.filterAfterPropertiesSelected();
    }
  }

  @action
  onPropertiesSelected(property: { id: string }[]) {
    this.nodeData.query!.properties = property.map((p) => p.id);
    this.filterAfterPropertiesSelected();
  }

  @action
  resetQuery() {
    const { limit, offset, skipGeometry } = this.nodeData.query ?? {};
    this.nodeData.query = {
      limit,
      offset,
      skipGeometry,
    };
  }

  filterAfterPropertiesSelected() {
    const currentProperties = [...(this.nodeData.query?.properties ?? [])];
    if (currentProperties.length > 0) {
      if (
        this.nodeData.dataTransform?.keyProperty &&
        !currentProperties.includes(this.nodeData.dataTransform.keyProperty)
      ) {
        this.nodeData.dataTransform!.keyProperty = undefined;
      }

      if (!this.nodeData.query?.skipGeometry) {
        currentProperties.push(GEOMETRY_KEY);
      }

      this.nodeData.dataTransform!.valueProperties =
        this.nodeData.dataTransform!.valueProperties?.filter((id) =>
          currentProperties.includes(id),
        ) || [];
    }
  }

  queryTask = task(
    { restartable: true },
    async (apiId: string, collectionId: string, query: any) => {
      await timeout(this.DEBOUNCE_MS);

      return this.ogcApiFeatures.fetchFeatures(apiId, collectionId, query);
    },
  );
}
