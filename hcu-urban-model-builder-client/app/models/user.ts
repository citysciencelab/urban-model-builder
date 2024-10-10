import { Type } from '@warp-drive/core-types/symbols';
import Model, {
  attr,
  hasMany,
  belongsTo,
  type AsyncBelongsTo,
  type AsyncHasMany,
} from '@ember-data/model';
import type ModelsUser from './models-user';
import type ModelModel from './model';

export default class UserModel extends Model {
  [Type] = 'user' as const;

  @attr('string') declare oidcId: string;
  @attr('string') declare email: string;

  @hasMany('model', { async: true, inverse: 'createdBy' })
  declare models: AsyncHasMany<ModelModel>;

  @hasMany('modelsUser', { async: true, inverse: 'user' })
  declare modelsUsers: AsyncHasMany<ModelsUser>;
}
