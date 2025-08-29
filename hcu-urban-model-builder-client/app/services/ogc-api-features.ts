import Service from '@ember/service';
import { OgcApiFeaturesClient } from 'hcu-urban-model-builder-backend/';

export default class OgcApiFeaturesService extends Service {
  private clientCache = new Map<string, OgcApiFeaturesClient>();

  private getClient(baseUrl?: string): OgcApiFeaturesClient {
    const url = baseUrl || 'https://api.hamburg.de/datasets/v1';

    if (!this.clientCache.has(url)) {
      this.clientCache.set(url, new OgcApiFeaturesClient(url));
    }

    return this.clientCache.get(url)!;
  }

  async getAvailableApis(baseUrl?: string) {
    return this.getClient(baseUrl).getApis();
  }

  async getAvailableCollections(apiId: string, baseUrl?: string) {
    return this.getClient(baseUrl).getAvailableCollections(apiId);
  }

  async getQueryableProperties(apiId: string, collectionId: string, baseUrl?: string) {
    return this.getClient(baseUrl).getQueryableProperties(apiId, collectionId);
  }

  async getPropertiesSchema(apiId: string, collectionId: string, baseUrl?: string) {
    return this.getClient(baseUrl).getPropertiesSchema(apiId, collectionId);
  }

  async fetchFeatures(apiId: string, collectionId: string, query?: any, baseUrl?: string) {
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
