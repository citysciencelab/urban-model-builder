import Service from '@ember/service';
import { OgcApiFeaturesClient } from 'hcu-urban-model-builder-backend/';

export default class OgcApiFeaturesService extends Service {
  private clientCache = new Map<string, OgcApiFeaturesClient>();

  // Debug method to clear cache
  clearCache() {
    console.log('[Frontend Service] Clearing client cache');
    this.clientCache.clear();
  }

  private getClient(baseUrl?: string): OgcApiFeaturesClient {
    const url = baseUrl || 'https://api.hamburg.de/datasets/v1';
    console.log(`[Frontend Service] getClient called with URL: ${url}`);

    if (!this.clientCache.has(url)) {
      console.log(`[Frontend Service] Creating new client for URL: ${url}`);
      const client = new OgcApiFeaturesClient(url);
      this.clientCache.set(url, client);

      // Debug: Log the actual baseURL of the axios client
      console.log(`[Frontend Service] Created client with axios baseURL: ${(client as any).client.defaults.baseURL}`);
    } else {
      console.log(`[Frontend Service] Using cached client for URL: ${url}`);
      const cachedClient = this.clientCache.get(url)!;

      // Debug: Log the actual baseURL of the cached axios client
      console.log(`[Frontend Service] Cached client has axios baseURL: ${(cachedClient as any).client.defaults.baseURL}`);
    }

    return this.clientCache.get(url)!;
  }

  async getAvailableApis(baseUrl?: string) {
    return this.getClient(baseUrl).getApis();
  }

  async getAvailableCollections(apiId: string, baseUrl?: string) {
    console.log(`[Frontend Service] getAvailableCollections called with apiId: ${apiId}, baseUrl: ${baseUrl}`);
    const client = this.getClient(baseUrl);
    console.log(`[Frontend Service] Using client for baseUrl: ${baseUrl || 'default'}`);
    console.log(`[Frontend Service] Available client methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(client)));

    try {
      // Use the getCollections method directly since getAvailableCollections may not be available
      console.log(`[Frontend Service] Using getCollections method`);
      const result = await (client as any).getCollections(apiId);

      console.log(`[Frontend Service] getAvailableCollections result:`, result);
      return result;
    } catch (error) {
      console.error(`[Frontend Service] Error in getAvailableCollections:`, error);
      console.error(`[Frontend Service] Error details:`, {
        message: (error as any).message,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
        url: (error as any).config?.url,
        method: (error as any).config?.method
      });
      throw error;
    }
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
