import { app } from './app.js'
import { logger } from './logger.js'
import initJobQueue from './init-job-queue.js';


const port = app.get('port')
const host = app.get('host')

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection %O', reason))

const main = async () => {
  try {
    logger.info('[Boot]: Init job queue');
    await initJobQueue(app);
    logger.verbose('[Boot]: Init job queue done');
    app.listen(port).then(() =>
      logger.info(`Feathers app listening on http://${host}:${port}`)
    );
  } catch (error) {
    logger.error(error);
  }
};

main().catch(console.error);