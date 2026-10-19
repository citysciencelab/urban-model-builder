import { cached } from '@ember-data/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { TrackedAsyncData } from 'ember-async-data';
import { task, timeout } from 'ember-concurrency';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type OgcApiFeaturesService from 'hcu-urban-model-builder-client/services/ogc-api-features';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
import {
  DEFAULT_OGC_ENDPOINT,
  GEOMETRY_KEY,
  isGeometryProperty,
  isSingleApiEndpoint,
  resolveOgcEndpoint,
  transformFeatures,
  type Nodes,
  type OgcEndpoint,
} from 'hcu-urban-model-builder-backend';

export interface NodeFormFieldsOgcApiFeaturesSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
    modelsVersion?: ModelsVersion;
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

  get availableOgcEndpoints(): OgcEndpoint[] {
    const endpoints = this.args.modelsVersion?.ogcEndpoints;
    return endpoints && endpoints.length > 0
      ? endpoints
      : [DEFAULT_OGC_ENDPOINT];
  }

  // resolved the same way as in the simulation, so the preselected endpoint is the one that is used
  get selectedEndpoint() {
    return resolveOgcEndpoint(this.nodeData, this.availableOgcEndpoints);
  }

  get currentBaseUrl() {
    return this.selectedEndpoint.baseUrl;
  }

  get isSingleApiEndpoint() {
    return isSingleApiEndpoint(this.selectedEndpoint);
  }

  // single API endpoints serve their collections from the root
  get effectiveApiId() {
    return this.isSingleApiEndpoint ? '' : this.nodeData.apiId;
  }

  get apiInfoUrl() {
    return `${this.currentBaseUrl}/${this.nodeData.apiId}/api`;
  }

  get collectionInfoUrl() {
    const collectionId = this.nodeData.collectionId;
    if (!collectionId) return '#';

    if (this.isSingleApiEndpoint) {
      return `${this.currentBaseUrl}/collections/${collectionId}`;
    }
    const apiId = this.nodeData.apiId;
    return apiId
      ? `${this.currentBaseUrl}/${apiId}/collections/${collectionId}`
      : '#';
  }

  @cached
  get availableApis() {
    return new TrackedAsyncData(
      this.ogcApiFeatures.getAvailableApis(this.currentBaseUrl),
    );
  }

  get selectedApi() {
    if (this.isSingleApiEndpoint || !this.availableApis.isResolved) {
      return null;
    }

    return (
      this.availableApis.value?.find((api) => api.id === this.nodeData.apiId) ??
      null
    );
  }

  @cached
  get availableCollections() {
    const apiId = this.effectiveApiId;
    const baseUrl = this.currentBaseUrl;

    if (apiId === undefined || apiId === null) {
      return new TrackedAsyncData(Promise.resolve(null));
    }
    return new TrackedAsyncData(
      this.ogcApiFeatures.getAvailableCollections(apiId, baseUrl),
    );
  }

  get selectedCollection() {
    if (!this.availableCollections.isResolved) {
      return null;
    }

    return (
      this.availableCollections.value?.find(
        (collection) => collection.id === this.nodeData.collectionId,
      ) ?? null
    );
  }

  get isCollectionSelectDisabled() {
    const hasApiId = this.isSingleApiEndpoint || !!this.nodeData.apiId;
    return !(hasApiId && this.availableCollections.isResolved);
  }

  @cached
  get propertiesSchema() {
    const apiId = this.effectiveApiId;
    const collectionId = this.nodeData.collectionId;
    const baseUrl = this.currentBaseUrl;

    const fetch = async () => {
      if (apiId === undefined || apiId === null || !collectionId) {
        return null;
      }

      const properties = await this.ogcApiFeatures.getPropertiesSchema(
        apiId,
        collectionId,
        baseUrl,
      );

      // geometry is controlled by the skip geometry toggle and added to the request automatically
      return Object.entries(properties)
        .filter(([, property]) => !isGeometryProperty(property))
        .map(([id, property]) => ({
          id: id,
          ...property,
          title: property.title || id,
          type: property.type || 'string',
        }));
    };
    return new TrackedAsyncData(fetch());
  }

  get selectedProperties() {
    if (!this.propertiesSchema.isResolved || !this.propertiesSchema.value) {
      return [];
    }
    // properties that no longer exist in the collection are ignored
    return (
      this.nodeData.query?.['properties']
        ?.map((id: string) =>
          this.propertiesSchema.value!.find((property) => property.id === id),
        )
        .filter(Boolean) ?? []
    );
  }

  get loadError(): string | null {
    for (const data of [
      this.availableApis,
      this.availableCollections,
      this.propertiesSchema,
      this.currentQueryResult,
    ]) {
      if (data.isRejected) {
        return (data.error as Error)?.message ?? String(data.error);
      }
    }
    return null;
  }

  @cached
  get currentQueryResult() {
    const fetch = async () => {
      const apiId = this.effectiveApiId;
      const collectionId = this.nodeData.collectionId;
      const query = this.nodeData.query;

      if (apiId === undefined || apiId === null || !collectionId || !query) {
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
    if (!this.currentQueryResult.isResolved) {
      return '';
    }
    const features = this.currentQueryResult.value?.features ?? [];

    return transformFeatures(
      features,
      this.nodeData.dataTransform?.keyProperty,
      this.nodeData.dataTransform?.valueProperties,
      true,
    );
  }

  get numberOfAllMatchingFeatures() {
    if (!this.currentQueryResult.isResolved) {
      return null;
    }
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
  onEndpointSelected(endpoint: OgcEndpoint) {
    // the endpoint is copied to the node so it still works if it is removed from the model version
    this.nodeData.endpointId = endpoint.id;
    this.nodeData.baseUrl = endpoint.baseUrl;
    this.nodeData.apiType = endpoint.apiType;

    if (isSingleApiEndpoint(endpoint)) {
      this.nodeData.apiId = '';
    } else {
      delete this.nodeData.apiId;
    }
    delete this.nodeData.collectionId;
    this.nodeData = {
      ...this.nodeData,
    };
    this.resetQuery();
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

    if (!this.nodeData.dataTransform) {
      this.nodeData.dataTransform = {
        keyProperty: undefined,
        valueProperties: [],
      };
    }

    if (currentProperties.length > 0) {
      if (
        this.nodeData.dataTransform.keyProperty &&
        !currentProperties.includes(this.nodeData.dataTransform.keyProperty)
      ) {
        this.nodeData.dataTransform.keyProperty = undefined;
      }

      if (!this.nodeData.query?.skipGeometry) {
        currentProperties.push(GEOMETRY_KEY);
      }

      this.nodeData.dataTransform.valueProperties =
        this.nodeData.dataTransform.valueProperties?.filter((id: string) =>
          currentProperties.includes(id),
        ) || [];
    }
  }

  queryTask = task(
    { restartable: true },
    async (
      apiId: string,
      collectionId: string,
      query: NonNullable<Nodes['data']['query']>,
    ) => {
      await timeout(this.DEBOUNCE_MS);

      return this.ogcApiFeatures.fetchFeatures(
        apiId,
        collectionId,
        query,
        this.currentBaseUrl,
      );
    },
  );
}
