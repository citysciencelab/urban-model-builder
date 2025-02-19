import { Feature } from './ogc-api-features-client.js'
import _ from 'lodash'

export const GEOMETRY_KEY = '__geometry__'

export function transformFeatures(features: Feature[], key?: string, value?: string[], pretty = false) {
  const data = transformData(features, key, value)
  return toSimulationVectorString(data, pretty)
}

export function transformData(data: Feature[], keyProperty?: string, valueProperties?: string[]) {
  const valueTransformFunc = getValueTransformFunc(valueProperties)

  if (keyProperty && valueProperties) {
    return data.reduce(
      (acc, item) => {
        acc[item.properties![keyProperty]] = valueTransformFunc(item)
        return acc
      },
      {} as Record<string, any>
    )
  } else if (valueProperties && valueProperties.length > 0) {
    return data.map((item) => valueTransformFunc(item))
  }

  return data
}

function getValueTransformFunc(valueProperties?: string[]) {
  if (valueProperties && valueProperties.length === 1) {
    return (item: Feature) => getValueByKey(item, valueProperties[0])
  } else if (valueProperties && valueProperties.length > 1) {
    return (item: Feature) =>
      valueProperties.reduce(
        (acc, key) => {
          const val = getValueByKey(item, key)
          if (val !== undefined) {
            acc[key] = val
          }
          return acc
        },
        {} as Record<string, any>
      )
  }

  return (item: Feature) => item
}

function getValueByKey(feature: Feature, key: string) {
  return key === GEOMETRY_KEY ? feature.geometry : feature.properties?.[key]
}

export function toSimulationVectorString(json: any, pretty = false) {
  return JSON.stringify(json, null, pretty ? 2 : undefined)
    .replace(/\[/g, '{')
    .replace(/\]/g, '}')
}
