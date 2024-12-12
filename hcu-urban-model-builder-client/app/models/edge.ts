import Model, { attr, belongsTo, type AsyncBelongsTo } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type Node from './node';
import { EdgeType } from 'hcu-urban-model-builder-backend';
import type ModelsVersion from './models-version';
import { dasherize } from '@ember/string';

export default class Edge extends Model {
  [Type] = 'edge' as const;

  @attr('number') declare type: EdgeType;

  @belongsTo('modelsVersion', { async: true, inverse: 'edges' })
  declare modelsVersions: ModelsVersion;

  @belongsTo('node', { async: true, inverse: 'sourceEdges' })
  declare source: AsyncBelongsTo<Node>;

  @belongsTo('node', { async: true, inverse: 'targetEdges' })
  declare target: AsyncBelongsTo<Node>;

  @attr('string') declare sourceHandle: string;

  @attr('string') declare targetHandle: string;

  @attr() declare points: { data: { id: string; x: number; y: number }[] };

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;

  get raw() {
    return {
      id: this.id,
      type: dasherize(EdgeType[this.type]),
      source: this.source.id,
      target: this.target.id,
      sourceHandle: this.sourceHandle,
      targetHandle: this.targetHandle,
      reconnectable: this.reconnectable,
      data: {
        points: (this.points?.data || []).map((point) => ({
          ...point,
          active: true,
        })),
      },
    };
  }

  get reconnectable() {
    if (this.type === EdgeType.Link) {
      return true;
    }
    if (this.type === EdgeType.Flow) {
      if (this.sourceHandle.startsWith('flow-source')) {
        return 'target';
      } else if (this.targetHandle.startsWith('flow-target')) {
        return 'source';
      }
    }
  }
}
