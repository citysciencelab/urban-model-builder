import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type Edge from './edge';
import { NodeType } from 'hcu-urban-model-builder-backend';
import type ModelsVersion from './models-version';

export default class Node extends Model {
  [Type] = 'node' as const;

  private listeners: Set<(newNode: Node) => void> = new Set();

  @attr('number') declare type: NodeType;

  @attr('string') declare name: string;

  @attr() declare data: { value?: string; rate?: number };

  @attr() declare position: { x: number; y: number };

  @attr('number') declare height: number;

  @attr('number') declare width: number;

  @belongsTo('modelsVersion', { async: true, inverse: 'nodes' })
  declare modelsVersions: ModelsVersion;

  @hasMany('edge', { async: true, inverse: 'source' })
  declare sourceEdges: Edge[];

  @hasMany('edge', { async: true, inverse: 'target' })
  declare targetEdges: Edge[];

  @belongsTo('node', { async: true, inverse: null })
  declare parent: Node;

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;

  get raw() {
    return {
      id: this.id,
      type: NodeType[this.type].toLocaleLowerCase(),
      data: this.data,
      position: this.position,
      parentId: this.parent?.id,
      height: this.height,
      width: this.width,
    };
  }

  emitSave() {
    this.listeners.forEach((listener) => listener(this));
  }

  onSave(callback: () => void) {
    this.listeners.add(callback);
  }

  offSave(listener: (newNode: Node) => void) {
    this.listeners.delete(listener);
  }
}
