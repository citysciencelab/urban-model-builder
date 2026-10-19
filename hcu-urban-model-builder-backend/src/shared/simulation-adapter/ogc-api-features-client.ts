import axios, { AxiosInstance, isAxiosError } from 'axios'
import _ from 'lodash'
import { DEFAULT_OGC_ENDPOINT } from './ogc-endpoints.js'

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
  name?: string
  description?: string
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

// OGC API Features Part 6 adds the `properties` (and `skipGeometry`) query parameters
const PROPERTY_SELECTION_CONFORMANCE = 'http://www.opengis.net/spec/ogcapi-features-6/0.0/conf/properties'

export class OgcApiFeaturesClient {
  client: AxiosInstance

  private propertiesSchemaCache = new Map<string, Promise<Record<string, Property>>>()
  private conformanceCache = new Map<string, Promise<string[]>>()

  constructor(baseURL: string = DEFAULT_OGC_ENDPOINT.baseUrl) {
    this.client = axios.create({
      baseURL,
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
    return (response.data.apis || []).map((api: any) => ({
      id: api.id,
      title: api.title || api.name || api.id,
      description: api.description || ''
    }))
  }

  async getCollections(apiId: string): Promise<Collection[]> {
    const response = await this.client.get(this.collectionsPath(apiId))
    return (response.data.collections || []).map((collection: any) => ({
      id: collection.id,
      title: collection.title || collection.name || collection.id,
      name: collection.name,
      description: collection.description
    }))
  }

  async fetchFeatures(
    apiId: string,
    collectionId: string,
    query: FilterQuery = {}
  ): Promise<FeaturesResponse> {
    const [propertiesSchema, supportsPropertySelection] = await Promise.all([
      this.getPropertiesSchema(apiId, collectionId),
      this.supportsPropertySelection(apiId)
    ])
    const collectionData = await this.client.get<FeaturesResponse>(
      `${this.collectionsPath(apiId)}/${collectionId}/items`,
      {
        params: this.serializeFeatureQuery(query, propertiesSchema, supportsPropertySelection),
        headers: {
          Accept: 'application/geo+json, application/problem+json;q=0.9'
        }
      }
    )
    const selectedProperties = this.getSelectedProperties(query, propertiesSchema)
    const data = collectionData.data
    data.features = data.features.map((feature: any) => {
      if (query.skipGeometry) {
        delete feature.geometry
      }
      // servers without property selection return all properties
      if (selectedProperties.length > 0 && feature.properties) {
        feature.properties = _.pick(feature.properties, selectedProperties)
      }
      if (feature.properties === null) {
        delete feature.properties
      }
      return feature
    })
    return data
  }

  async getQueryableProperties(apiId: string, collectionId: string): Promise<Record<string, Property>> {
    const response = await this.client.get(`${this.collectionsPath(apiId)}/${collectionId}/queryables`, {
      headers: {
        Accept: 'application/schema+json, application/problem+json;q=0.9'
      }
    })

    return response.data.properties || {}
  }

  async getPropertiesSchema(apiId: string, collectionId: string): Promise<Record<string, Property>> {
    const cacheKey = `${apiId}/${collectionId}`
    if (!this.propertiesSchemaCache.has(cacheKey)) {
      const request = this.fetchPropertiesSchema(apiId, collectionId)
      // do not cache failed requests
      request.catch(() => this.propertiesSchemaCache.delete(cacheKey))
      this.propertiesSchemaCache.set(cacheKey, request)
    }
    return this.propertiesSchemaCache.get(cacheKey)!
  }

  private async fetchPropertiesSchema(
    apiId: string,
    collectionId: string
  ): Promise<Record<string, Property>> {
    try {
      const response = await this.client.get(`${this.collectionsPath(apiId)}/${collectionId}/schema`, {
        headers: {
          Accept: 'application/schema+json, application/problem+json;q=0.9'
        }
      })
      return response.data.properties || {}
    } catch (error) {
      // the schema endpoint is optional (OGC API Features Part 5), fall back to the queryables
      if (isAxiosError(error) && error.response?.status === 404) {
        return this.getQueryableProperties(apiId, collectionId)
      }
      throw error
    }
  }

  private async supportsPropertySelection(apiId: string) {
    if (!this.conformanceCache.has(apiId)) {
      const request = this.client
        .get(apiId ? `${apiId}/conformance` : 'conformance')
        .then((response) => (response.data.conformsTo as string[]) || [])
        // without conformance information only core parameters are sent
        .catch(() => [])
      this.conformanceCache.set(apiId, request)
    }
    const conformsTo = await this.conformanceCache.get(apiId)!
    return conformsTo.includes(PROPERTY_SELECTION_CONFORMANCE)
  }

  /**
   * Single API endpoints serve their collections from the root, multi API endpoints below the api id
   */
  private collectionsPath(apiId: string) {
    return apiId ? `${apiId}/collections` : 'collections'
  }

  // drop properties that no longer exist in the collection (e.g. renamed geometry properties of older nodes)
  private getSelectedProperties(query: FilterQuery, propertiesSchema: Record<string, Property>) {
    return (query.properties ?? []).filter(
      (key) => key in propertiesSchema && !isGeometryProperty(propertiesSchema[key])
    )
  }

  /**
   * Servers may reject unknown query parameters and property names with 400, so only supported parameters are sent.
   * With property selection the geometry is treated as a regular property and has to be requested explicitly.
   */
  private serializeFeatureQuery(
    query: FilterQuery,
    propertiesSchema: Record<string, Property>,
    supportsPropertySelection: boolean
  ) {
    const { propertyFilters = {}, filter, limit, offset, skipGeometry } = query
    const rest: Record<string, any> = { limit, offset }
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

    if (supportsPropertySelection) {
      const selectedProperties = this.getSelectedProperties(query, propertiesSchema)
      if (selectedProperties.length > 0) {
        if (!skipGeometry) {
          selectedProperties.push(...getGeometryPropertyNames(propertiesSchema))
        }
        rest.properties = selectedProperties.join(',')
      }
      if (skipGeometry) {
        rest.skipGeometry = true
      }
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
