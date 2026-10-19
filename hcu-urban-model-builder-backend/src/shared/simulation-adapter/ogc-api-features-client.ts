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
  title?: string
  name?: string
  description?: string
}

type Collection = {
  id: string
  title?: string
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

export class OgcApiFeaturesClient {
  client: AxiosInstance

  private propertiesSchemaCache = new Map<string, Promise<Record<string, Property>>>()

  constructor(baseURL: string = 'https://api.hamburg.de/datasets/v1') {
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
    try {
      const response = await this.client.get('/')
      const apis = response.data.apis || []
      
      // Ensure each API has proper display properties
      return apis.map((api: any) => ({
        id: api.id,
        title: api.title || api.name || api.id,
        description: api.description || ''
      }))
    } catch (error) {
      console.error('Error fetching APIs:', error)
      return []
    }
  }

  async getCollections(apiId: string): Promise<Collection[]> {
    try {
      console.log(`[OGC] Fetching collections for API: ${apiId}`)
      // For single API endpoints, use collections directly from root
      const url = apiId ? `${apiId}/collections` : 'collections';
      console.log(`[OGC] Full URL: ${this.client.defaults.baseURL}/${url}`)
      
      const response = await this.client.get(url)
      console.log(`[OGC] Response status:`, response.status)
      console.log(`[OGC] Response headers:`, response.headers)
      console.log(`[OGC] Raw response data:`, response.data)
      
      const collections = response.data.collections || []
      console.log(`[OGC] Raw collections:`, collections)
      
      // Ensure each collection has proper display properties
      const processedCollections = collections.map((collection: any) => ({
        id: collection.id,
        title: collection.title || collection.name || collection.id,
        name: collection.name,
        description: collection.description
      }))
      
      console.log(`[OGC] Processed collections:`, processedCollections)
      return processedCollections
    } catch (error) {
      console.error(`[OGC] Error fetching collections for API ${apiId}:`, error)
      return []
    }
  }

  async getAvailableCollections(apiId: string): Promise<Collection[]> {
    console.log(`[OGC] getAvailableCollections called for API: ${apiId}`)
    const result = await this.getCollections(apiId)
    console.log(`[OGC] getAvailableCollections returning:`, result)
    return result
  }

  async fetchFeatures(
    apiId: string,
    collectionId: string,
    query: FilterQuery = {}
  ): Promise<FeaturesResponse> {
    // For single API endpoints, use collections directly from root
    const baseUrl = apiId ? `${apiId}/collections` : 'collections';
    const propertiesSchema = await this.getPropertiesSchema(apiId, collectionId)
    const collectionData = await this.client.get<FeaturesResponse>(
      `${baseUrl}/${collectionId}/items`,
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
    try {
      const baseUrl = apiId ? `${apiId}/collections` : 'collections';
      const url = `${baseUrl}/${collectionId}/queryables`;
      
      console.log(`[OGC] Fetching queryable properties for API: ${apiId}, Collection: ${collectionId}`);
      console.log(`[OGC] Queryables URL: ${this.client.defaults.baseURL}/${url}`);
      
      const response = await this.client.get(url, {
        params: {
          f: 'application/schema+json'
        },
        headers: {
          Accept: 'application/schema+json'
        }
      });
      
      console.log(`[OGC] Queryables response status:`, response.status);
      console.log(`[OGC] Queryables response headers:`, response.headers);
      console.log(`[OGC] Queryables raw response data:`, response.data);
      
      const properties = response.data.properties || {};
      console.log(`[OGC] Processed queryable properties:`, properties);
      console.log(`[OGC] Number of queryable properties:`, Object.keys(properties).length);
      
      return properties;
    } catch (error) {
      console.error(`[OGC] Error fetching queryable properties for API ${apiId}, Collection ${collectionId}:`, error);
      console.error(`[OGC] Error details:`, {
        message: (error as any).message,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
        url: (error as any).config?.url,
        method: (error as any).config?.method
      });
      return {};
    }
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

  private async fetchPropertiesSchema(apiId: string, collectionId: string): Promise<Record<string, Property>> {
    try {
      const baseUrl = apiId ? `${apiId}/collections` : 'collections';
      const url = `${baseUrl}/${collectionId}/schema`;
      
      console.log(`[OGC] Fetching properties schema for API: ${apiId}, Collection: ${collectionId}`);
      console.log(`[OGC] Schema URL: ${this.client.defaults.baseURL}/${url}`);
      
      const response = await this.client.get(url, {
        params: {
          f: 'application/schema+json'
        },
        headers: {
          Accept: 'application/schema+json'
        }
      });
      
      console.log(`[OGC] Schema response status:`, response.status);
      console.log(`[OGC] Schema response headers:`, response.headers);
      console.log(`[OGC] Schema raw response data:`, response.data);
      
      const properties = response.data.properties || {};
      console.log(`[OGC] Processed schema properties:`, properties);
      console.log(`[OGC] Number of schema properties:`, Object.keys(properties).length);
      
      return properties;
    } catch (error) {
      console.error(`[OGC] Error fetching properties schema for API ${apiId}, Collection ${collectionId}:`, error);
      console.error(`[OGC] Error details:`, {
        message: (error as any).message,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
        url: (error as any).config?.url,
        method: (error as any).config?.method
      });
      
      // Fallback: Try queryables endpoint if schema fails
      console.log(`[OGC] Schema failed, trying queryables endpoint as fallback...`);
      return this.getQueryableProperties(apiId, collectionId);
    }
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
