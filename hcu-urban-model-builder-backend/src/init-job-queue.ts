import { logger } from './logger.js'
import { Application } from './declarations.js';
import { JobQueueAdapter } from './utils/job-queue-adapter/base.js';
import jobQueueAdapterFactory from './utils/job-queue-adapter/job-queue-adapter-factory.js';
import { Logger } from 'winston';

export default async function (app: Application) {
  const jobQueueAdapter = jobQueueAdapterFactory('bullmq', logger, {});

  await jobQueueAdapter.start();

  app.set('jobQueue', jobQueueAdapter);

  await registerJobFunction(app, jobQueueAdapter);

  await registerJobTriggers(app, jobQueueAdapter, logger);
}

async function registerJobFunction(app: Application, jobQueueAdapter: JobQueueAdapter<any>) {
  await jobQueueAdapter.receive('process_simulation', (data) => { console.log('process_simulation finished'); return Promise.resolve(); });
}

async function registerJobTriggers(app: Application, jobQueueAdapter: JobQueueAdapter<any>, logger: Logger) {

}