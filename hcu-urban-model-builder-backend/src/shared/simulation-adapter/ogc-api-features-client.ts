import axios, { AxiosInstance, isAxiosError } from 'axios'
import _ from 'lodash'

export type Feature = {
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
  type?: string
  title: string
  format?: string
  'x-ogc-role'?: string
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
  properties?: string[]
  filter?: string
  propertyFilters?: Record<string, PropertyFilter>
  [key: string]: any
}

export class OgcApiFeaturesClient {
  client: AxiosInstance

  private propertiesSchemaCache = new Map<string, Promise<Record<string, Property>>>()

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.hamburg.de/datasets/v1',
      headers: {
        Accept: 'application/json'
      }
    })
    // the API answers errors with application/problem+json, surface its detail instead of the generic axios message
    this.client.interceptors.response.use(undefined, (error) => {
      const detail = isAxiosError(error) ? error.response?.data?.detail : undefined
      if (typeof detail === 'string') {
        error.message = `OGC API Features: ${detail}`
      }
      return Promise.reject(error)
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
    const propertiesSchema = await this.getPropertiesSchema(apiId, collectionId)
    const collectionData = await this.client.get<FeaturesResponse>(
      `${apiId}/collections/${collectionId}/items`,
      {
        params: this.serializeFeatureQuery(query, propertiesSchema),
        headers: {
          Accept: 'application/geo+json, application/problem+json;q=0.9'
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
        Accept: 'application/schema+json, application/problem+json;q=0.9'
      }
    })

    return response.data.properties
  }

  async getPropertiesSchema(apiId: string, collectionId: string): Promise<Record<string, Property>> {
    const cacheKey = `${apiId}/${collectionId}`
    if (!this.propertiesSchemaCache.has(cacheKey)) {
      const request = this.client
        .get(`${apiId}/collections/${collectionId}/schema`, {
          headers: {
            Accept: 'application/schema+json, application/problem+json;q=0.9'
          }
        })
        .then((response) => response.data.properties as Record<string, Property>)
      // do not cache failed requests
      request.catch(() => this.propertiesSchemaCache.delete(cacheKey))
      this.propertiesSchemaCache.set(cacheKey, request)
    }
    return this.propertiesSchemaCache.get(cacheKey)!
  }

  /**
   * The API only accepts known query parameters and property names (unknown ones are rejected with 400).
   * Since the geometry is treated as a regular property, it has to be requested explicitly via `properties`.
   */
  private serializeFeatureQuery(query: FilterQuery, propertiesSchema: Record<string, Property>) {
    const { propertyFilters = {}, filter, properties, limit, offset, skipGeometry } = query
    const rest: Record<string, any> = { limit, offset, skipGeometry }
    const propertyQueryParams: Record<string, any> = {}
    let filtersFromProperties = ''

    for (const [key, filter] of Object.entries(propertyFilters)) {
      if (!(key in propertiesSchema) || isGeometryProperty(propertiesSchema[key])) {
        continue
      }
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

    // drop properties that no longer exist in the collection (e.g. renamed geometry properties of older nodes)
    const selectedProperties = (properties ?? []).filter(
      (key) => key in propertiesSchema && !isGeometryProperty(propertiesSchema[key])
    )
    if (selectedProperties.length > 0) {
      if (!skipGeometry) {
        selectedProperties.push(...getGeometryPropertyNames(propertiesSchema))
      }
      rest.properties = selectedProperties.join(',')
    }
    if (filter && filtersFromProperties) {
      rest.filter = `(${filter}) AND ${filtersFromProperties}`
    } else if (filter) {
      rest.filter = filter
    } else if (filtersFromProperties) {
      rest.filter = filtersFromProperties
    }

    return _.omitBy(
      { ...propertyQueryParams, ...rest },
      (value) => value === undefined || value === null || value === ''
    )
  }
}

export function isGeometryProperty(property: Property) {
  return property['x-ogc-role'] === 'primary-geometry' || !!property.format?.startsWith('geometry-')
}

function getGeometryPropertyNames(propertiesSchema: Record<string, Property>) {
  const geometryProperties = Object.entries(propertiesSchema).filter(([, property]) =>
    isGeometryProperty(property)
  )
  const primaryGeometry = geometryProperties.find(
    ([, property]) => property['x-ogc-role'] === 'primary-geometry'
  )
  return primaryGeometry ? [primaryGeometry[0]] : geometryProperties.map(([key]) => key)
}
