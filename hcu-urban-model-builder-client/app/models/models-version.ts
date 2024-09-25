import Model, {
  attr,
  hasMany,
  type AsyncHasMany,
  belongsTo,
  type AsyncBelongsTo,
} from '@ember-data/model';
import type Edge from './edge';
import type Node from './node';
import { Type } from '@warp-drive/core-types/symbols';
import type ModelModel from './model';

export default class ModelsVersion extends Model {
  declare [Type]: 'models-version';

  @attr('string') declare internalName: string;
  @attr('number') declare minorVersion: number;
  @attr('number') declare majorVersion: number;
  @attr('number') declare draftVersion: number;

  @belongsTo('model', { async: true, inverse: 'modelsVersion' })
  declare model: AsyncBelongsTo<ModelModel>;

  @hasMany('nodes', { async: true, inverse: 'modelsVersions' })
  declare nodes: AsyncHasMany<Node>;
  @hasMany('edges', { async: true, inverse: 'modelsVersions' })
  declare edges: AsyncHasMany<Edge>;

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;

  get hasVersion() {
    return (
      this.majorVersion > 0 || this.minorVersion > 0 || this.draftVersion > 0
    );
  }

  get versionString() {
    if (this.hasVersion) {
      return `v${this.majorVersion}.${this.minorVersion}.${this.draftVersion}`;
    } else {
      return 'draft';
    }
  }
}
