import axios, { AxiosInstance } from 'axios'

type Feature = {
  id: number
  type: 'Feature'
  geometry: { type: string; coordinates: any }
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

  async fetchFeatures(apiId: string, collectionId: string) {
    let offset = 0
    let numberReturned = 0
    let numberMatched = 0
    const limit = 100
    const allFeatures: any[] = []
    do {
      const collectionData = await this.client.get<FeaturesResponse>(
        `${apiId}/collections/${collectionId}/items`,
        {
          params: {
            limit: limit,
            offset: offset
          },
          headers: {
            Accept: 'application/geo+json'
          }
        }
      )

      offset += limit
      numberReturned += collectionData.data.numberReturned

      numberMatched = collectionData.data.numberMatched

      const currentFeature = collectionData.data.features
      allFeatures.push(...currentFeature)
    } while (numberReturned < numberMatched)

    return allFeatures
  }
}
