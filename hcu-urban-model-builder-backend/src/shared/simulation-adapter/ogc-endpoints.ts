export type OgcApiType = 'multi-api' | 'single-api' | 'unknown'

export type OgcEndpoint = {
  id: string
  name: string
  baseUrl: string
  isDefault: boolean
  apiType?: OgcApiType
}

export const DEFAULT_OGC_ENDPOINT: OgcEndpoint = {
  id: 'hamburg-api',
  name: 'Urban Data Platform Hamburg',
  baseUrl: 'https://api.hamburg.de/datasets/v1',
  isDefault: true,
  apiType: 'multi-api'
}

type OgcNodeEndpointData = {
  endpointId?: string
  baseUrl?: string
  apiType?: string
}

/**
 * Resolves the endpoint of an OGC API Features node. The endpoint configured on the model version wins, the
 * endpoint copied to the node is used if it was removed from the model version. Nodes without any endpoint
 * information (created before endpoints were configurable or keeping the preselected endpoint) use the default.
 */
export function resolveOgcEndpoint(
  nodeData: OgcNodeEndpointData,
  ogcEndpoints?: OgcEndpoint[] | null
): OgcEndpoint {
  const endpoints = ogcEndpoints ?? []
  const configuredEndpoint =
    nodeData.endpointId && endpoints.find((endpoint) => endpoint.id === nodeData.endpointId)
  if (configuredEndpoint) {
    return configuredEndpoint
  }
  if (nodeData.baseUrl) {
    return {
      id: nodeData.endpointId ?? nodeData.baseUrl,
      name: nodeData.baseUrl,
      baseUrl: nodeData.baseUrl,
      isDefault: false,
      apiType: nodeData.apiType as OgcApiType | undefined
    }
  }
  return endpoints.find((endpoint) => endpoint.isDefault) ?? endpoints[0] ?? DEFAULT_OGC_ENDPOINT
}

export function isSingleApiEndpoint(endpoint: OgcEndpoint) {
  return endpoint.apiType === 'single-api'
}
