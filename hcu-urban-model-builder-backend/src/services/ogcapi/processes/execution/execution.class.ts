// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, Params, ServiceInterface } from '@feathersjs/feathers'
import _ from 'lodash'

import type { Application } from '../../../../declarations.js'
import { NotFound, Unprocessable } from '@feathersjs/errors'
import { NodeType } from '../../../nodes/nodes.shared.js'
import { ModelsSimulate } from '../../../models/models.schema.js'
import { BullMqJobQueueAdapter } from '../../../../utils/job-queue-adapter/bullmq.js'
import { link } from 'fs'

type ProcessesExecution = any
type ProcessesExecutionData = Record<string, number>

export type { ProcessesExecution, ProcessesExecutionData }

export interface ProcessesExecutionServiceOptions {
  app: Application
}

export interface ProcessesExecutionParams extends Params { }

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class ProcessesExecutionService<
  ServiceParams extends ProcessesExecutionParams = ProcessesExecutionParams
> implements ServiceInterface<ProcessesExecution, ProcessesExecutionData, ServiceParams> {
  app: Application
  constructor(public options: ProcessesExecutionServiceOptions) {
    this.app = options.app
  }

  protected getProcessId(params?: ServiceParams): number {
    const { processId } = params?.route as { processId: number }
    if (!processId) {
      throw new Unprocessable('Missing processId')
    }
    return processId
  }
  async get(id: Id, params?: ServiceParams): Promise<ProcessesExecution> {
    throw new Error('Method not implemented')
  }
  async create(data: ProcessesExecutionData, params?: ServiceParams): Promise<ProcessesExecution> {
    const processId = this.getProcessId(params)
    const process = await this.app.service('models-versions').get(processId)
    if (!process || !process.publishedToUMPAt) {
      throw new NotFound('Process not found')
    }
    const inputNodes = await this.app.service('nodes').find({
      query: {
        type: {
          $ne: NodeType.Ghost
        },
        modelsVersionsId: processId,
        isParameter: true
      }
    })
    const inputNodeNameToIdMap = new Map<string, number>()
    for (const node of inputNodes.data) {
      inputNodeNameToIdMap.set(_.snakeCase(node.name!), node.id)
    }
    const outputNodes = await this.app.service('nodes').find({
      query: {
        type: {
          $ne: NodeType.Ghost
        },
        modelsVersionsId: processId,
        isOutputParameter: true
      }
    })
    const outputNodeNameToIdMap = new Map<string, number>()
    for (const node of outputNodes.data) {
      outputNodeNameToIdMap.set(_.snakeCase(node.name!), node.id)
    }
    const simulationData: ModelsSimulate = { id: processId, nodeIdToParameterValueMap: {} }
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        const nodeId = inputNodeNameToIdMap.get(key)
        if (nodeId !== undefined && simulationData.nodeIdToParameterValueMap != undefined) {
          simulationData.nodeIdToParameterValueMap[nodeId] = value
        }
      }
    }

    const jobQueue: BullMqJobQueueAdapter = this.app.get('jobQueue')
    const jobId = await jobQueue.send('process_simulation', { ...simulationData, inputs: data })

    return {
      processId: processId,
      jobId: jobId,
      state: 'accepted',
      links: [
        { href: `/ogcapi/jobs/${jobId}`, rel: 'self' },
        { href: `/ogcapi/jobs`, rel: 'collection' },
        { href: `/ogcapi/jobs/${jobId}/results`, rel: 'results' }
      ]
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
