import { BullMqJobQueueAdapter } from './bullmq.js';

const adaptersMap = {
  'bullmq': BullMqJobQueueAdapter
};

type AdaptersMap = typeof adaptersMap;

type AdapterNames = keyof AdaptersMap;

type Values = typeof adaptersMap[AdapterNames]

export default function jobQueueAdapterFactory<K extends AdapterNames, V extends InstanceType<Values>>(adapterName: K, logger: any, adapterConfig: V['config']) {
  if (!(adapterName in adaptersMap)) {
    throw Error(`no adapter found for name: ${adapterName}`);
  }
  return new adaptersMap[adapterName](logger, adapterConfig);
}