import Model, { attr } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';

export default class Node extends Model {
  [Type] = 'node' as const;

  @attr() declare data: { label: string };
  @attr() declare position: { x: number; y: number };

  get rawNode() {
    return {
      id: this.id,
      type: 'base',
      data: this.data,
      position: this.position,
    };
  }
}
