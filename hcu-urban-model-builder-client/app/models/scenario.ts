import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type ScenariosValue from './scenarios-value';

export default class Scenario extends Model {
  [Type] = 'scenario' as const;

  @attr('string') declare name: string;
  @attr('boolean') declare isDefault: boolean;

  @hasMany('scenarios-value', { async: true, inverse: 'scenarios' })
  declare scenariosValues: ScenariosValue[];
}
