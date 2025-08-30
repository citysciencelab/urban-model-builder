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
    modelsVersion: any; // ModelsVersion with ogcEndpoints
    form: any;
    node: any;
    errors: any;
    disabled?: boolean;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
}

export default class NodeFormFieldsOgcApiFeaturesComponent extends Component<NodeFormFieldsOgcApiFeaturesSignature> {
  readonly DEBOUNCE_MS = 250;
  readonly instanceId = Math.random().toString(36).substr(2, 9);

  @service declare ogcApiFeatures: OgcApiFeaturesService;

  @tracked showPreviewModal = false;
  @tracked jsonPointer = '';
  @tracked jsonPointerValue = '';

  private _collectionsData: TrackedAsyncData<any> | null = null;
  private _lastApiId: string | undefined = undefined;
  private _lastBaseUrl: string | undefined = undefined;

  get nodeData() {
    return this.args.changeset.dataProxy.data;
  }

  set nodeData(data: Nodes['data']) {
    this.args.changeset.dataProxy.data = data;
  }

  get availableOgcEndpoints() {
    return this.args.modelsVersion?.ogcEndpoints || [];
  }

  get selectedEndpoint() {
    const endpointId = this.nodeData.endpointId;
    return this.availableOgcEndpoints.find((endpoint: any) => endpoint.id === endpointId) ||
           this.availableOgcEndpoints.find((endpoint: any) => endpoint.isDefault) ||
           this.availableOgcEndpoints[0];
  }

  get currentBaseUrl() {
    return this.selectedEndpoint?.baseUrl || 'https://api.hamburg.de/datasets/v1';
  }

  @cached
  get availableApis() {
    return new TrackedAsyncData(this.ogcApiFeatures.getAvailableApis(this.currentBaseUrl));
  }

  get selectedApi() {
    if (!this.availableApis.isResolved) {
      return null;
    }
    return (
      this.availableApis.value?.find((api) => api.id === this.nodeData.apiId) ??
      null
    );
  }

  get availableCollections() {
    const apiId = this.nodeData.apiId;
    const baseUrl = this.currentBaseUrl;

    // Only create new TrackedAsyncData if the key parameters actually changed
    if (!this._collectionsData || this._lastApiId !== apiId || this._lastBaseUrl !== baseUrl) {
      console.log(`[Component ${this.instanceId}] Creating new TrackedAsyncData for apiId: ${apiId}, baseUrl: ${baseUrl}`);
      console.log(`[Component ${this.instanceId}] Previous values - apiId: ${this._lastApiId}, baseUrl: ${this._lastBaseUrl}`);

      this._lastApiId = apiId;
      this._lastBaseUrl = baseUrl;

      if (!apiId) {
        console.log(`[Component ${this.instanceId}] No apiId provided, returning empty resolved TrackedAsyncData`);
        this._collectionsData = new TrackedAsyncData(Promise.resolve(null));
      } else {
        const fetch = async () => {
          console.log(`[Component ${this.instanceId}] Fetching collections for apiId: ${apiId}, baseUrl: ${baseUrl}`);
          try {
            const result = await this.ogcApiFeatures.getAvailableCollections(apiId, baseUrl);
            console.log(`[Component ${this.instanceId}] Collections fetch result:`, result);
            return result;
          } catch (error) {
            console.error(`[Component ${this.instanceId}] Error fetching collections:`, error);
            throw error;
          }
        };

        this._collectionsData = new TrackedAsyncData(fetch());
        console.log(`[Component ${this.instanceId}] Created new TrackedAsyncData, initial state:`, this._collectionsData.state);
      }
    }

    return this._collectionsData;
  }  get selectedCollection() {
    console.log(`[Component] selectedCollection getter called`);
    console.log(`[Component] availableCollections.state:`, this.availableCollections.state);
    console.log(`[Component] availableCollections.isResolved:`, this.availableCollections.isResolved);

    if (this.availableCollections.state === 'REJECTED') {
      console.error(`[Component] Collections request was rejected:`, this.availableCollections.error);
      return null;
    }

    if (!this.availableCollections.isResolved) {
      console.log(`[Component] Collections not resolved yet, returning null`);
      return null;
    }

    console.log(`[Component] availableCollections.value:`, this.availableCollections.value);
    console.log(`[Component] Looking for collectionId:`, this.nodeData.collectionId);

    const result = this.availableCollections.value?.find(
      (collection) => collection.id === this.nodeData.collectionId,
    ) ?? null;

    console.log(`[Component] selectedCollection result:`, result);
    return result;
  }

  get isCollectionSelectDisabled() {
    const hasApiId = !!this.nodeData.apiId;
    const isResolved = this.availableCollections.isResolved;
    const isRejected = this.availableCollections.state === 'REJECTED';

    const disabled = !(hasApiId && isResolved && !isRejected);

    console.log(`[Component] isCollectionSelectDisabled: ${disabled}`);
    console.log(`[Component] nodeData.apiId: ${this.nodeData.apiId}`);
    console.log(`[Component] availableCollections.isResolved: ${isResolved}`);
    console.log(`[Component] availableCollections.state: ${this.availableCollections.state}`);

    if (isRejected) {
      console.error(`[Component] Collections disabled because request was rejected:`, this.availableCollections.error);
    }

    return disabled;
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
        this.currentBaseUrl
      );

      return Object.entries(properties).map(([id, property]) => ({
        id: id,
        ...property,
      }));
    };
    return new TrackedAsyncData(fetch());
  }

  get selectedProperties() {
    if (!this.propertiesSchema.isResolved || !this.propertiesSchema.value) {
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

  @action
  onEndpointSelected(endpoint: any) {
    this.nodeData.endpointId = endpoint.id;
    // Reset API and collection selection when endpoint changes
    delete this.nodeData.apiId;
    delete this.nodeData.collectionId;
    this.nodeData = {
      ...this.nodeData,
    };
    this.resetQuery();
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
  retryCollections() {
    console.log(`[Component ${this.instanceId}] Retrying collections fetch - not needed without cache`);
    // Force re-evaluation by accessing the getter (this will create a new TrackedAsyncData)
    const collections = this.availableCollections;
    console.log(`[Component] Forced re-evaluation, new state:`, collections.state);
  }

  @action
  onApiSelected(api: NonNullable<this['availableApis']['value']>[number]) {
    console.log(`[Component ${this.instanceId}] onApiSelected called with api:`, api);
    console.log(`[Component ${this.instanceId}] Setting apiId to:`, api.id);

    // Explicitly invalidate the collections cache
    this._collectionsData = null;
    this._lastApiId = undefined;
    this._lastBaseUrl = undefined;

    this.nodeData.apiId = api.id;
    delete this.nodeData.collectionId;
    this.nodeData = {
      ...this.nodeData,
    };

    console.log(`[Component ${this.instanceId}] nodeData after API selection:`, this.nodeData);
    this.resetQuery();

    // Force re-evaluation of availableCollections by accessing it
    setTimeout(() => {
      console.log(`[Component ${this.instanceId}] After API selection - checking collections state:`, this.availableCollections.state);
      console.log(`[Component ${this.instanceId}] After API selection - collections value:`, this.availableCollections.value);
    }, 100);
  }

  @action
  onCollectionSelected(collection: { id: string }) {
    console.log(`[Component] onCollectionSelected called with collection:`, collection);
    this.nodeData.collectionId = collection.id;
    console.log(`[Component] Set collectionId to:`, collection.id);
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

      return this.ogcApiFeatures.fetchFeatures(apiId, collectionId, query, this.currentBaseUrl);
    },
  );
}
