import Service from '@ember/service';
import { OgcApiFeaturesClient } from 'hcu-urban-model-builder-backend/';

export default class OgcApiFeaturesService extends Service {
  private client = new OgcApiFeaturesClient();

  async getAvailableApis() {
    return this.client.getApis();
  }

  async getAvailableCollections(apiId: string) {
    return this.client.getCollections(apiId);
  }

  async getQueryableProperties(apiId: string, collectionId: string) {
    return this.client.getQueryableProperties(apiId, collectionId);
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
