import Model, {
  attr,
  hasMany,
  type AsyncHasMany,
  belongsTo,
} from '@ember-data/model';
import type Edge from './edge';
import type Node from './node';
import { Type } from '@warp-drive/core-types/symbols';

export default class ModelsVersion extends Model {
  declare [Type]: 'models-version';

  @attr('string') declare internalName: string;
  @attr('number') declare minorVersion: number;
  @attr('number') declare majorVersion: number;


  @belongsTo('model', { async: true, inverse: 'latestDraftVersion' })
  declare model: number;

  @hasMany('nodes', { async: true, inverse: 'modelsVersions' })
  declare nodes: AsyncHasMany<Node[]>;
  @hasMany('edges', { async: true, inverse: 'modelsVersions' })
  declare edges: AsyncHasMany<Edge>;

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;
}
