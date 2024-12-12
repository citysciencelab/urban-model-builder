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
import { inject as service } from '@ember/service';
import type Store from '@ember-data/store';
import { cached } from '@ember-data/tracking';
import { TrackedAsyncData } from 'ember-async-data';
import type Scenario from './scenario';

export default class ModelsVersion extends Model {
  declare [Type]: 'models-version';

  @service declare store: Store;

  @attr('number') declare minorVersion: number;
  @attr('number') declare majorVersion: number;
  @attr('number') declare draftVersion: number;
  @attr('string') declare notes: string;
  @attr('boolean') declare isLatest: boolean;
  @attr('number', { readOnly: true }) declare role: number;

  @attr('number') declare timeStart: number;
  @attr('number') declare timeStep: number;
  @attr('number') declare timeLength: number;
  @attr('string') declare timeUnits: string;
  @attr('string') declare algorithm: string;
  @attr('string') declare globals: string;

  @attr() declare customUnits: { data: { [key: string]: number[] } };

  @belongsTo('model', { async: true, inverse: 'modelsVersions' })
  declare model: AsyncBelongsTo<ModelModel>;

  @hasMany('nodes', { async: true, inverse: 'modelsVersions' })
  declare nodes: AsyncHasMany<Node>;
  @hasMany('edges', { async: true, inverse: 'modelsVersions' })
  declare edges: AsyncHasMany<Edge>;

  @hasMany('scenario', { async: true, inverse: 'modelsVersions' })
  declare scenarios: AsyncHasMany<Scenario>;

  @attr('date') declare publishedBy: number; // TODO: relation to user?
  @attr('date') declare publishedAt: Date;
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

  /**
   * Add a new custom unit to the model version and the reference to the node
   * @param newUnit
   * @param nodeId
   */
  async addCustomUnit(newUnit: string, nodeId: number) {
    if (!this.customUnits) {
      this.customUnits = { data: {} };
    }
    this.customUnits.data = {
      ...this.customUnits.data,
      [newUnit]: [nodeId],
    };
    await this.save();
  }

  /**
   * Add a reference to a custom unit
   * @param unit
   * @param nodeId
   */
  async addCustomUnitReference(unit: string, nodeId: number) {
    if (
      this.customUnits?.data &&
      unit in this.customUnits.data &&
      this.customUnits.data[unit]
    ) {
      if (!this.customUnits.data[unit].includes(nodeId)) {
        this.customUnits.data[unit].push(nodeId);
      }
      await this.save();
    }
  }

  /**
   * Remove old custom unit references
   * @param unit
   * @param nodeId
   */
  async removeOldUnitReferences(unit: string, nodeId: number) {
    if (this.customUnits?.data) {
      for (const customUnit in this.customUnits.data) {
        const nodeIds = this.customUnits.data[customUnit];
        if (customUnit != unit && nodeIds) {
          const index = nodeIds.indexOf(nodeId);
          if (index > -1) {
            nodeIds.splice(index, 1);
            if (nodeIds.length == 0) {
              delete this.customUnits.data[customUnit];
            }
          }
        }
      }
      await this.save();
    }
  }

  async removeCustomUnit(unit: string, nodeId: number) {
    if (this.customUnits?.data) {
      if (unit in this.customUnits.data && this.customUnits.data[unit]) {
        // remove the nodeId from the customUnit
        const index = this.customUnits.data[unit].indexOf(nodeId);
        if (index > -1) {
          this.customUnits.data[unit].splice(index, 1);
        }
        // no more nodes reference this customUnit, remove it
        if (this.customUnits.data[unit].length == 0) {
          delete this.customUnits.data[unit];
        }
        await this.save();
      }
    }
  }

  existsInCustomUnits(unit: string) {
    if (this.customUnits?.data) {
      return unit in this.customUnits.data;
    }
    return false;
  }

  @cached
  get defaultScenario() {
    const promise = new Promise(async (resolve) => {
      const defaultScenario = await this.store.query('scenario', {
        modelsVersionsId: this.id,
        isDefault: true,
      });
      if (defaultScenario.length > 0) {
        resolve(defaultScenario[0]);
      }
    });
    return new TrackedAsyncData(promise);
  }
}
