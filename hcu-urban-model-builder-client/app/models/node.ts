import Model, { attr, hasMany } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type Edge from './edge';
import { NodeType } from 'hcu-urban-model-builder-backend';

export default class Node extends Model {
  [Type] = 'node' as const;

  @attr('number') declare type: NodeType;

  @attr() declare data: { label: string };

  @attr() declare position: { x: number; y: number };

  @attr('number') declare value: number;
  @attr('string') declare rate: string;

  @hasMany('edge', { async: true, inverse: 'source' })
  declare sourceEdges: Edge[];

  @hasMany('edge', { async: true, inverse: 'target' })
  declare targetEdges: Edge[];

  get raw() {
    return {
      id: this.id,
      type: NodeType[this.type].toLocaleLowerCase(),
      data: this.data,
      position: this.position,
    };
  }
}
