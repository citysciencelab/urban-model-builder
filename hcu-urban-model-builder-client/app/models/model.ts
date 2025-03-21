import Model, {
  attr,
  belongsTo,
  hasMany,
  type AsyncBelongsTo,
  type AsyncHasMany,
} from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type ModelsVersion from './models-version';
import type { FormModelClone, FormModelPublish } from 'global';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import { inject as service } from '@ember/service';
import type ModelsUser from './models-user';
import type UserModel from './user';
import { Roles } from 'hcu-urban-model-builder-backend';

export default class ModelModel extends Model {
  declare [Type]: 'model';

  @service declare feathers: FeathersService;

  @attr('string') declare internalName: string;
  @attr('string') declare description: string;

  @attr('number', { readOnly: true })
  declare currentMajorVersion: number;
  @attr('number', { readOnly: true })
  declare currentMinorVersion: number;
  @attr('number', { readOnly: true })
  declare currentDraftVersion: number;
  @attr('number', { readOnly: true })
  declare role: number;

  @belongsTo('user', { async: true, inverse: 'models' })
  declare createdBy: AsyncBelongsTo<UserModel>;

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
  declare latestDraftVersion: AsyncBelongsTo<ModelsVersion>;

  @belongsTo('modelsVersion', {
    async: true,
    readOnly: true,
    inverse: null,
  })
  declare latestPublishedVersion: AsyncBelongsTo<ModelsVersion>;

  @hasMany('modelsUser', { async: true, inverse: 'model' })
  declare modelsUsers: AsyncHasMany<ModelsUser>;

  @attr('date', { readOnly: true })
  declare createdAt: Date;
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

  get permissions(): Promise<ModelsUser[]> {
    return this.store.query('models-user', {
      modelId: this.id,
    });
  }

  get canDelete() {
    return this.role >= Roles.owner;
  }

  get canEdit() {
    return this.role >= Roles.co_owner;
  }

  async publishMinor(version: ModelsVersion, formModel: FormModelPublish) {
    await this.feathers.app.service('models').publishMinor({
      id: this.id,
      modelsVersionsId: version.id,
      notes: formModel.notes,
      publishedToUMP: formModel.publishedToUMP,
    });
  }

  async publishMajor(version: ModelsVersion, formModel: FormModelPublish) {
    await this.feathers.app.service('models').publishMajor({
      id: this.id,
      modelsVersionsId: version.id,
      notes: formModel.notes,
      publishedToUMP: formModel.publishedToUMP,
    });
  }

  async cloneVersion(version: ModelsVersion, formModel: FormModelClone) {
    return this.feathers.app.service('models').cloneVersion({
      id: version.id,
      internalName: formModel.internalName,
    });
  }
}
