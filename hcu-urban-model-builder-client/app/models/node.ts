import Model, { attr, hasMany } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type Edge from './edge';

export default class Node extends Model {
  [Type] = 'node' as const;

  @attr() declare data: { label: string };

  @attr() declare position: { x: number; y: number };

  @hasMany('edge', { async: true, inverse: 'source' })
  declare sourceEdges: Edge[];

  @hasMany('edge', { async: true, inverse: 'target' })
  declare targetEdges: Edge[];

  get raw() {
    return {
      id: this.id,
      type: 'base',
      data: this.data,
      position: this.position,
    };
  }
}
