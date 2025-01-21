import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type Scenario from './scenario';

export default class ScenariosValue extends Model {
  [Type] = 'scenarios-value' as const;

  @attr('number') declare value: number;
  @belongsTo('node', { async: true, inverse: 'scenariosValues' })
  declare nodes: Node;
  @belongsTo('scenario', { async: true, inverse: 'scenariosValues' })
  declare scenarios: Scenario;

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;
}
