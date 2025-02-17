import { Feature } from './ogc-api-features-client.js'
import _ from 'lodash'

export const GEOMETRY_KEY = '__geometry__'

export function transformFeatures(features: Feature[], key?: string, value?: string[], pretty = false) {
  const data = transformData(features, key, value)
  return toSimulationVectorString(data, pretty)
}

export function transformData(data: Feature[], key?: string, value?: string[]) {
  const valueTransformMethod = getValueTransformMethod(value)

  if (key && value) {
    return data.reduce(
      (acc, item) => {
        acc[item.properties![key]] = valueTransformMethod(item)
        return acc
      },
      {} as Record<string, any>
    )
  } else if (value && value.length > 1) {
    return data.map((item) => valueTransformMethod(item))
  }

  return data
}

function getValueTransformMethod(valueProperties?: string[]) {
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
