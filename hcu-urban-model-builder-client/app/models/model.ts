import Model, { attr, belongsTo } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';

export default class ModelModel extends Model {
  declare [Type]: 'model';

  @attr('string') declare internalName: string;

  @attr('number') declare currentMajorVersion: number;
  @attr('number') declare currentMinorVersion: number;
  @attr('number') declare currentDraftVersion: number;

  @belongsTo('modelsVersion', { async: true, inverse: 'model' })
  declare latestDraftVersion: number;

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;
}
