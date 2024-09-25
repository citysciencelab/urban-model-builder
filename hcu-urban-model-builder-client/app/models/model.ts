import Model, {
  attr,
  belongsTo,
  hasMany,
  type AsyncHasMany,
} from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type ModelsVersion from './models-version';

export default class ModelModel extends Model {
  declare [Type]: 'model';

  @attr('string') declare internalName: string;

  @attr('number', { readOnly: true })
  declare currentMajorVersion: number;
  @attr('number', { readOnly: true })
  declare currentMinorVersion: number;
  @attr('number', { readOnly: true })
  declare currentDraftVersion: number;

  @hasMany('modelsVersion', {
    async: true,
    inverse: 'model',
    sortField: 'createdAt',
    sortDirection: -1,
  })
  declare modelsVersions: AsyncHasMany<ModelsVersion>;

  @belongsTo('modelsVersion', {
    async: true,
    readOnly: true,
    inverse: null,
  })
  declare latestDraftVersion: number;

  @attr('date', { readOnly: true }) declare createdAt: Date;
  @attr('date', { readOnly: true }) declare updatedAt: Date;

  get hasVersion() {
    return (
      this.currentMajorVersion > 0 ||
      this.currentMinorVersion > 0 ||
      this.currentDraftVersion > 0
    );
  }

  get versionString() {
    if (this.hasVersion) {
      return `v${this.currentMajorVersion}.${this.currentMinorVersion}.${this.currentDraftVersion}`;
    } else {
      return 'draft';
    }
  }
}
