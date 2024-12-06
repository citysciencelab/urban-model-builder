import { DefaultJobOptions, Job, JobsOptions, Queue, Worker } from 'bullmq'
import { Logger } from 'winston'
import { JobQueueAdapter } from './base.js'
import { Redis } from 'ioredis'
import { randomUUID } from 'crypto'
import configuration from '@feathersjs/configuration'

interface BullMqJobQueueAdapterConfig {}

export class BullMqJobQueueAdapter extends JobQueueAdapter<BullMqJobQueueAdapterConfig> {
  private connection: Redis

  private workers: { [queueName: string]: Worker } = {}

  readonly defaultJobOptions: DefaultJobOptions = {
    attempts: 3,
    removeOnComplete: {
      //age: 3600, // 1 hour
      count: 1000 // keep up to 1000 jobs
    },
    removeOnFail: {
      age: 24 * 3600 // keep up to 24 hours
    }
  }

  constructor(logger: Logger, config: BullMqJobQueueAdapterConfig) {
    super(logger, config)
    const { redisPort, redisHost } = (configuration()() as any).redis
    this.connection = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null
    })
  }

  async start() {
    //
  }

  async stop() {
    await Promise.all(
      Object.values(this.workers).map((worker) => {
        return worker.close()
      })
    )
  }

  async receive(queueName: string, callback: (data: any) => Promise<any>) {
    if (this.workers[queueName]) {
      throw new Error(`receiver for '${queueName}' already exits`)
    }

    const worker = new Worker(
      queueName,
      async (job) => {
        this.logger.verbose(`Job '${queueName}' started`)
        const result = await callback(job.data)
        this.logger.verbose(`Job '${queueName}' done`)
        return result
      },
      { connection: this.connection }
    )

    this.workers[queueName] = worker

    worker.on('error', (error) => {
      this.logger.error(`Job '${queueName}' has an error`)
      this.logger.error(error)
    })

    worker.on('failed', (job, error) => {
      this.logger.error(`Job '${queueName}' has an error`)
      this.logger.error(error)
    })
  }

  async send(queueName: string, data: any) {
    return this.addNewJob(queueName, data)
  }

  async schedule(queueName: string, cronPattern: string) {
    await this.unscheduleAllExceptForCurrentCron(queueName, cronPattern)
    await this.addNewJob(
      queueName,
      {},
      {
        repeat: {
          pattern: cronPattern
        }
      }
    )
  }

  private async unscheduleAllExceptForCurrentCron(queueName: string, currentCronPattern: string) {
    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: this.defaultJobOptions
    })
    const repeatableJobs = await queue.getRepeatableJobs()

    for (const job of repeatableJobs) {
      if (job.pattern !== currentCronPattern) {
        await queue.removeRepeatableByKey(job.key)
      }
    }
  }

  private async addNewJob(queueName: string, data: any, opts?: JobsOptions | undefined) {
    const myQueue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: this.defaultJobOptions
    })

    const job = await myQueue.add(queueName, data, { ...opts, jobId: randomUUID() })
    return job.id
  }

  async getJobs(queueName: string): Promise<Job[]> {
    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: this.defaultJobOptions
    })
    return queue.getJobs()
  }

  async getJob(queueName: string, jobId: string) {
    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: this.defaultJobOptions
    })
    return queue.getJob(jobId)
  }
}
