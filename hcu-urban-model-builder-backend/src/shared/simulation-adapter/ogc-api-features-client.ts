import axios, { AxiosInstance } from 'axios'

type Feature = {
  id: number
  type: 'Feature'
  geometry?: { type: string; coordinates: any }
  properties: Record<string, any> | null
}

type FeaturesResponse = {
  numberReturned: number
  numberMatched: number
  features: Feature[]
}

type Api = {
  id: string
  title: string
  description: string
}

type Collection = {
  id: string
  title: string
}

type Property = {
  type: string
  title: string
}

type FilterProperties = Record<string, any> & {
  limit?: number
  offset?: number
  skipGeometry?: boolean
  selectedProperties?: string[]
}

export class OgcApiFeaturesClient {
  client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.hamburg.de/datasets/v1',
      headers: {
        Accept: 'application/json'
      }
    })
  }

  async getApis(): Promise<Api[]> {
    const response = await this.client.get('/')
    return response.data.apis
  }

  async getCollections(apiId: string): Promise<Collection[]> {
    const response = await this.client.get(`${apiId}/collections`)
    return response.data.collections
  }

  async fetchFeatures(apiId: string, collectionId: string, query: FilterProperties = {}): Promise<Feature[]> {
    const collectionData = await this.client.get<FeaturesResponse>(
      `${apiId}/collections/${collectionId}/items`,
      {
        params: {
          ...query,
          properties: query.properties?.join(',')
        },
        headers: {
          Accept: 'application/geo+json'
        }
      }
    )

    return collectionData.data.features.map((feature: any) => {
      if (query.skipGeometry) {
        delete feature.geometry
      }
      if (feature.properties === null) {
        delete feature.properties
      }
      return feature
    })
  }

  async getQueryableProperties(apiId: string, collectionId: string): Promise<Record<string, Property>> {
    const response = await this.client.get(`${apiId}/collections/${collectionId}/queryables`, {
      headers: {
        Accept: 'application/schema+json'
      }
    })

    return response.data.properties
  }

  async getPropertiesSchema(apiId: string, collectionId: string): Promise<Record<string, Property>> {
    const response = await this.client.get(`${apiId}/collections/${collectionId}/schema`, {
      headers: {
        Accept: 'application/schema+json'
      }
    })

    return response.data.properties
  }
}
