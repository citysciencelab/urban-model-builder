import Model, { attr, belongsTo } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type Node from './node';

export default class Edge extends Model {
  [Type] = 'edge' as const;

  @belongsTo('node', { async: true, inverse: 'sourceEdges' })
  declare source: Node;

  @belongsTo('node', { async: true, inverse: 'targetEdges' })
  declare target: Node;

  @attr('string') declare sourceHandle: string;

  @attr('string') declare targetHandle: string;

  get raw() {
    return {
      id: this.id,
      source: this.source.id,
      target: this.target.id,
      sourceHandle: this.sourceHandle,
      targetHandle: this.targetHandle,
    };
  }
}
