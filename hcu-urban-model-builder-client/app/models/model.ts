import Model, { attr, hasMany, type AsyncHasMany } from '@ember-data/model';
import type Edge from './edge';
import type Node from './node';
import { Type } from '@warp-drive/core-types/symbols';

export default class ModelModel extends Model {
  declare [Type]: 'model';

  @attr('string') declare name: string;

  @hasMany('nodes', { async: true, inverse: 'model' })
  declare nodes: AsyncHasMany<Node[]>;
  @hasMany('edges', { async: true, inverse: 'model' })
  declare edges: AsyncHasMany<Edge>;

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;
}
