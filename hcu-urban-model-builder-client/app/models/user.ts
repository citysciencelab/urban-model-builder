import Model, { attr } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';

export default class UserModel extends Model {
  [Type] = 'user' as const;
  @attr('string') declare oidcId: string;
}
