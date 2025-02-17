import { Model } from 'simulation'
import { Nodes, NodeType } from '../../client.js'
import { OgcApiFeaturesClient } from './ogc-api-features-client.js'
import { transformFeatures } from './utils.js'

const getUnitsDefault = (node: Nodes) => {
  return node.data.units || 'Unitless'
}

const simulationFactoryMap = {
  [NodeType.Stock]: (model: Model, node: Nodes) => {
    return model.Stock({
      name: node.name!,
      initial: node.data.value,
      type: node.data.type,
      delay: node.data.delay,
      nonNegative: node.data.nonNegative,
      units: getUnitsDefault(node),
      constraints: node.data.constraints || {}
    })
  },
  [NodeType.Variable]: (model: Model, node: Nodes) => {
    return model.Variable({
      name: node.name!,
      value: node.data.value,
      units: getUnitsDefault(node),
      constraints: node.data.constraints || {}
    })
  },
  [NodeType.Flow]: (model: Model, node: Nodes) => {
    return model.Flow(null, null, {
      name: node.name!,
      rate: node.data.rate,
      nonNegative: node.data.nonNegative,
      units: getUnitsDefault(node),
      constraints: node.data.constraints || {}
    })
  },
  [NodeType.Converter]: (model: Model, node: Nodes) => {
    return model.Converter({
      name: node.name!,
      values: node.data.values,
      interpolation: node.data.interpolation || 'Linear',
      units: getUnitsDefault(node),
      constraints: node.data.constraints || {}
    })
  },
  [NodeType.State]: (model: Model, node: Nodes) => {
    return model.State({
      name: node.name!,
      residency: node.data.residency,
      startActive: node.data.startActive
    })
  },
  [NodeType.Transition]: (model: Model, node: Nodes) => {
    return model.Transition(null, null, {
      name: node.name!,
      value: node.data.value,
      recalculate: node.data.recalculate,
      repeat: node.data.repeat,
      trigger: node.data.trigger,
      constraints: node.data.constraints || {}
    })
  },
  [NodeType.Action]: (model: Model, node: Nodes) => {
    return model.Action({
      name: node.name!,
      value: node.data.value,
      recalculate: node.data.recalculate,
      repeat: node.data.repeat,
      trigger: node.data.trigger,
      action: node.data.action
    })
  },
  [NodeType.Population]: (model: Model, node: Nodes) => {
    return model.Population({
      name: node.name!,
      geoHeight: node.data.geoHeight,
      geoPlacementFunction: node.data.geoPlacementFunction,
      geoPlacementType: node.data.geoPlacementType,
      geoUnits: getUnitsDefault(node),
      geoWidth: node.data.geoWidth,
      geoWrapAround: node.data.geoWrapAround,
      networkFunction: node.data.networkFunction,
      networkType: node.data.networkType,
      populationSize: node.data.populationSize
    })
  },
  [NodeType.Agent]: (model: Model, node: Nodes) => {
    return model.Agent({
      name: node.name!
    })
  },
  [NodeType.Folder]: (model: Model, node: Nodes) => {
    return model.Folder({
      name: node.name!
    })
  },
  [NodeType.Ghost]: (model: Model, node: Nodes) => {
    throw new Error('Ghost nodes are not supported. Can not create a primitive for a ghost node.')
  },
  [NodeType.OgcApiFeatures]: async (model: Model, node: Nodes) => {
    const client = new OgcApiFeaturesClient()
    const features = await client.fetchFeatures(node.data.apiId!, node.data.collectionId!, node.data.query)

    return model.Variable({
      name: node.name!,
      value: transformFeatures(
        features.features,
        node.data.dataTransform?.keyProperty,
        node.data.dataTransform?.valueProperties
      )
    })
  }
}

export const primitiveFactory = async (model: Model, node: Nodes) => {
  return simulationFactoryMap[node.type](model, node)
}
