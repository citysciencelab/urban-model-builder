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

type PropertyFilter = {
  operator?: string
  value: string
}

type FilterQuery = {
  limit?: number
  offset?: number
  skipGeometry?: boolean
  selectedProperties?: string[]
  propertyFilters?: Record<string, PropertyFilter>
  [key: string]: any
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
    query: FilterQuery = {}
  ): Promise<FeaturesResponse> {
    const collectionData = await this.client.get<FeaturesResponse>(
      `${apiId}/collections/${collectionId}/items`,
      {
        params: this.serializeFeatureQuery(query),
        headers: {
          Accept: 'application/geo+json'
        }
      }
    )
    const data = collectionData.data
    data.features = data.features.map((feature: any) => {
      if (query.skipGeometry) {
        delete feature.geometry
      }
      if (feature.properties === null) {
        delete feature.properties
      }
      return feature
    })
    return data
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

  private serializeFeatureQuery(query: FilterQuery) {
    const { propertyFilters = {}, filter, properties, ...rest } = query
    const propertyQueryParams: Record<string, any> = {}
    let filtersFromProperties = ''

    for (const [key, filter] of Object.entries(propertyFilters)) {
      if (!filter.operator || filter.operator === '=') {
        propertyQueryParams[key] = filter.value
      } else {
        const subFilter = `${key} ${filter.operator} ${filter.value}`
        if (filtersFromProperties) {
          filtersFromProperties += ` AND ${subFilter}`
        } else {
          filtersFromProperties += subFilter
        }
      }
    }

    if (properties && properties.length > 0) {
      rest.properties = properties.join(',')
    }
    if (filter && filtersFromProperties) {
      rest.filter = `(${filter}) AND ${filtersFromProperties}`
    } else if (filter) {
      rest.filter = filter
    } else if (filtersFromProperties) {
      rest.filter = filtersFromProperties
    }

    return {
      ...propertyQueryParams,
      ...rest
    }
  }
}
