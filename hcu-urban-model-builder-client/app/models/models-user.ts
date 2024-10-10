import Model, { attr, belongsTo, type AsyncBelongsTo } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type ModelModel from './model';
import type UserModel from './user';
import type { Roles } from 'hcu-urban-model-builder-backend';

export default class ModelsUser extends Model {
  declare [Type]: 'models-user';

  @belongsTo('model', { async: true, inverse: 'modelsUsers' })
  declare model: AsyncBelongsTo<ModelModel>;

  // FIXME: does not seem to work as expected
  @belongsTo('user', { async: true, inverse: 'modelsUsers' })
  declare user: AsyncBelongsTo<UserModel>;

  @attr('string', { readOnly: true }) declare userEmail: string;
  @attr('number') declare role: Roles;
}
