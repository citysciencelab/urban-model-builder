// eslint-disable-next-line ember/use-ember-data-rfc-395-imports
import Store from 'ember-data/store';
import { service } from '@ember/service';
import { Type } from '@warp-drive/core-types/symbols';

export default class StoreService extends Store {
  @service storeEventEmitter;

  async saveRecord(record) {
    const event = this.getEventType(record);

    const savedRecord = await super.saveRecord(...arguments);

    this.storeEventEmitter.emit(record[Type], event, savedRecord);

    return savedRecord;
  }

  getEventType(record) {
    if (record.isNew) {
      return 'created';
    } else if (record.isDeleted) {
      return 'deleted';
    } else {
      return 'updated';
    }
  }
}
