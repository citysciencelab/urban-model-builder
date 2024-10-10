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
import type { FormModelClone, FormModelPublish } from 'global';
import { Roles } from 'hcu-urban-model-builder-backend';

export default class ModelsVersion extends Model {
  declare [Type]: 'models-version';

  @attr('string') declare internalName: string;
  @attr('number') declare minorVersion: number;
  @attr('number') declare majorVersion: number;
  @attr('number') declare draftVersion: number;
  @attr('string') declare notes: string;
  @attr('boolean') declare isLatest: boolean;
  @attr('number', { readOnly: true })
  declare role: number;

  @belongsTo('model', { async: true, inverse: 'modelsVersions' })
  declare model: AsyncBelongsTo<ModelModel>;

  @hasMany('nodes', { async: true, inverse: 'modelsVersions' })
  declare nodes: AsyncHasMany<Node>;
  @hasMany('edges', { async: true, inverse: 'modelsVersions' })
  declare edges: AsyncHasMany<Edge>;

  @attr('date') declare publishedBy: number; // TODO: relation to user?
  @attr('date') declare publishedAt: Date;
  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;

  @attr('number') declare timeLength: number;

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

  get isPublished() {
    return !!this.publishedAt;
  }

  get canEdit() {
    return (
      !this.isPublished && this.isLatest && this.role >= Roles.collaborator
    );
  }

  get canCreateNewDraft() {
    return this.isLatest && this.role >= Roles.collaborator;
  }

  get canPublish() {
    return this.isLatest && !this.isPublished && this.role >= Roles.co_owner;
  }

  get canShare() {
    return this.role >= Roles.co_owner;
  }

  get canClone() {
    return this.role != null && this.role >= Roles.none;
  }

  async _fetchIsLatestVersion() {
    const m = await this.model;
    if (m) {
      return (
        m.latestDraftVersion.id == this.id ||
        m.latestPublishedVersion.id == this.id
      );
    }
  }

  async publishMinor(formModel: FormModelPublish) {
    const parentModel = await this.model;
    if (parentModel) {
      parentModel.publishMinor(this, formModel);
    }
  }

  async publishMajor(formModel: FormModelPublish) {
    const parentModel = await this.model;
    if (parentModel) {
      parentModel.publishMajor(this, formModel);
    }
  }

  async cloneVersion(formModel: FormModelClone): Promise<ModelsVersion | null> {
    const parentModel = await this.model;
    if (parentModel) {
      return parentModel.cloneVersion(this, formModel);
    }
    return null;
  }
}
