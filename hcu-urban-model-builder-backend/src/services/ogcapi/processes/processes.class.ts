// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import _ from 'lodash'

import type { Params } from '@feathersjs/feathers'
import type { Application } from '../../../declarations.js'
import type { Processes, ProcessesDetails } from './processes.schema.js'
export type { Processes, ProcessesDetails }
export interface ProcessesServiceOptions {
  app: Application
}

export interface ProcessesParams extends Params { }

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class ProcessesService<ServiceParams extends ProcessesParams = ProcessesParams> {
  app: Application
  constructor(public options: ProcessesServiceOptions) {
    this.app = options.app
  }

  async find(_params?: ServiceParams): Promise<Processes> {
    const query = this.app.service('models-versions').createQuery({})
    query.where('publishedToUMPAt', 'IS NOT', null)
    // join on models to get the model name
    query.leftJoin('models as models', 'models.id', 'models_versions.modelId')
    query.select('models.internalName as modelName', 'models.description as modelDescription')
    const models = await this.app.service('models-versions').find({ knex: query })
    const mappedModels = models.data.map((model: any) => {
      return {
        id: model.id,
        title: model.modelName,
        description: model.modelDescription,
        jobControlOptions: ['async-execute'],
        version: `${model.majorVersion}.${model.minorVersion}.${model.draftVersion}`,
        links: [{ href: `/ogcapi/processes/${model.id}`, rel: 'self' }]
      }
    })
    return { processes: mappedModels, links: [{ href: '/ogcapi/processes' }] }
  }

  async get(id: number, _params?: ServiceParams): Promise<ProcessesDetails> {
    const modelQuery = this.app.service('models-versions').createQuery({})
    modelQuery.where('publishedToUMPAt', 'IS NOT', null)
    modelQuery.leftJoin('models as models', 'models.id', 'models_versions.modelId')
    modelQuery.select('models.internalName as modelName', 'models.description as modelDescription')

    const model: any = await this.app.service('models-versions').get(id, { knex: modelQuery })

    const inputNodes = await this.app
      .service('nodes')
      .find({ query: { modelsVersionsId: id, isParameter: true } })
    const outputNodes = await this.app
      .service('nodes')
      .find({ query: { modelsVersionsId: id, isOutputParameter: true } })
    const inputParameterData = inputNodes.data.reduce((acc: any, node: any) => {
      acc[_.snakeCase(node.name)] = {
        title: node.name,
        description: node.description,
        schema: {
          type: node.parameterType === 'boolean' ? 'boolean' : 'number',
          minimum: node.parameterMin,
          maximum: node.parameterMax,
          description: node.description
        }
      }
      if (node.parameterType === 'select') {
        acc[_.snakeCase(node.name)].schema.enum = node.parameterOptions.data.map((value: any) => value.value)
      }
      return acc
    }, {})

    const outputParameterData = outputNodes.data.reduce((acc: any, node: any) => {
      acc[_.snakeCase(node.name)] = {
        title: node.name,
        description: node.description,
        schema: {
          type: 'array',
          description: node.description,
          items: {
            type: 'number'
          }
        }
      }
      return acc
    }, {})

    return {
      id: model.id,
      title: model.modelName,
      description: model.modelDescription,
      jobControlOptions: ['async-execute'],
      version: `${model.majorVersion}.${model.minorVersion}.${model.draftVersion}`,
      inputs: inputParameterData,
      outputs: outputParameterData,
      links: [
        { href: `/ogcapi/processes/${model.id}`, rel: 'self' },
        { href: `/ogcapi/processes/${model.id}/execution`, rel: 'execute' },
        { href: `/ogcapi/processes/`, rel: 'collection' }
      ]
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
