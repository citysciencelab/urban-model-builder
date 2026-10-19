import Service from '@ember/service';
import {
  DEFAULT_OGC_ENDPOINT,
  OgcApiFeaturesClient,
} from 'hcu-urban-model-builder-backend/';

type FeatureQuery = Parameters<OgcApiFeaturesClient['fetchFeatures']>[2];

export default class OgcApiFeaturesService extends Service {
  // one client per endpoint, so the schema and conformance caches are shared
  private clientCache = new Map<string, OgcApiFeaturesClient>();

  private getClient(baseUrl?: string): OgcApiFeaturesClient {
    const url = baseUrl || DEFAULT_OGC_ENDPOINT.baseUrl;
    if (!this.clientCache.has(url)) {
      this.clientCache.set(url, new OgcApiFeaturesClient(url));
    }
    return this.clientCache.get(url)!;
  }

  async getAvailableApis(baseUrl?: string) {
    return this.getClient(baseUrl).getApis();
  }

  async getAvailableCollections(apiId: string, baseUrl?: string) {
    return this.getClient(baseUrl).getCollections(apiId);
  }

  async getQueryableProperties(
    apiId: string,
    collectionId: string,
    baseUrl?: string,
  ) {
    return this.getClient(baseUrl).getQueryableProperties(apiId, collectionId);
  }

  async getPropertiesSchema(
    apiId: string,
    collectionId: string,
    baseUrl?: string,
  ) {
    return this.getClient(baseUrl).getPropertiesSchema(apiId, collectionId);
  }

  async fetchFeatures(
    apiId: string,
    collectionId: string,
    query?: FeatureQuery,
    baseUrl?: string,
  ) {
    return this.getClient(baseUrl).fetchFeatures(apiId, collectionId, query);
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:ogc-api-features')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('ogc-api-features') declare altName: OgcApiFeaturesService;`.
declare module '@ember/service' {
  interface Registry {
    'ogc-api-features': OgcApiFeaturesService;
  }
}
