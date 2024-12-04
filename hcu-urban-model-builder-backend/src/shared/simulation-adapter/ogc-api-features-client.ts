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

type FilterProperties = Record<string, any>

type FetchFeatureOptions = {
  // limit?: number
  // offset?: number
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

  async fetchFeatures(
    apiId: string,
    collectionId: string,
    query: FilterProperties = {},
    options: FetchFeatureOptions = {}
  ): Promise<Feature[]> {
    let offset = 0
    let numberReturned = 0
    let numberMatched = 0
    const limit = 1000
    const allFeatures: any[] = []
    do {
      const collectionData = await this.client.get<FeaturesResponse>(
        `${apiId}/collections/${collectionId}/items`,
        {
          params: {
            limit: limit,
            offset: offset,
            skipGeometry: options.skipGeometry,
            ...query
          },
          headers: {
            Accept: 'application/geo+json'
          }
        }
      )

      offset += limit
      numberReturned += collectionData.data.numberReturned

      numberMatched = collectionData.data.numberMatched

      const currentFeature = collectionData.data.features.map((feature: any) => {
        if (options.skipGeometry) {
          delete feature.geometry
        }
        return feature
      })
      allFeatures.push(...currentFeature)
    } while (numberReturned < numberMatched)

    return allFeatures
  }

  async getQueryableProperties(apiId: string, collectionId: string): Promise<Record<string, Property>> {
    const response = await this.client.get(`${apiId}/collections/${collectionId}/queryables`, {
      headers: {
        Accept: 'application/schema+json'
      }
    })

    return response.data.properties
  }
}
