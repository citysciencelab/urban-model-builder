import { Logger } from 'winston'

export abstract class JobQueueAdapter<Config extends Record<string, any>> {
  constructor(
    protected logger: Logger,
    public config: Config
  ) {}

  abstract start(): Promise<void>

  abstract stop(): Promise<void>

  abstract receive(queueName: string, callback: (data: any) => Promise<any>): Promise<void>

  abstract send(queueName: string, data: any): Promise<String | undefined>

  abstract schedule(queueName: string, cronPattern: string): Promise<void>
}
