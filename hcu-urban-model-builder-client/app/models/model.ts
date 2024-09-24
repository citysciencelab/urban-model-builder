import Model, { attr, belongsTo } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';

export default class ModelModel extends Model {
  declare [Type]: 'model';

  @attr('string') declare internalName: string;

  @attr('number', { readOnly: true })
  declare currentMajorVersion: number;
  @attr('number', { readOnly: true })
  declare currentMinorVersion: number;
  @attr('number', { readOnly: true })
  declare currentDraftVersion: number;

  @belongsTo('modelsVersion', {
    async: true,
    readOnly: true,
    inverse: 'model',
  })
  declare latestDraftVersion: number;

  @attr('date', { readOnly: true }) declare createdAt: Date;
  @attr('date', { readOnly: true }) declare updatedAt: Date;
}
