import type Store from '@ember-data/store';
import { action } from '@ember/object';
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type Edge from 'hcu-urban-model-builder-client/models/edge';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type StoreEventEmitterService from './store-event-emitter';
import type Model from '@ember-data/model';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type EventBus from './event-bus';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';
import type { LegacyRelationshipSchema } from '@warp-drive/core-types/schema/fields';
import type ApplicationStateService from './application-state';
import { NodeType } from 'hcu-urban-model-builder-backend';
import type IntlService from 'ember-intl/services/intl';

export default class EmberReactConnectorService extends Service {
  @service declare applicationState: ApplicationStateService;
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;
  @service declare eventBus: EventBus;
  @service declare intl: IntlService;

  @tracked selected: (Node | Edge)[] = [];
  @tracked currentModel: ModelsVersion | null = null;
  @tracked sidebarElement: HTMLElement | null = null;
  @tracked toolbarElement: HTMLElement | null = null;

  get currentModelVersionId() {
    return this.currentModel!.id;
  }

  @action
  async save(type: 'node' | 'edge', id: string, rawData: any) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }

    return this.saveRecord(record, rawData);
  }

  @action
  async create(type: 'node' | 'edge', rawData: any) {
    const record = this.store.createRecord<Node | Edge>(type, {});

    record.modelsVersions = this.currentModel!;

    return this.saveRecord(record, rawData);
  }

  @action
  async delete(type: 'node' | 'edge', id: string) {
    this.selected = this.selected.filter((r) => r.id !== id);
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    record.deleteRecord();
    await record.save();
  }

  @action
  peekAll(type: 'node' | 'edge' | 'scenarios-value') {
    return this.store.peekAll<Node | Edge | ScenariosValue>(type);
  }

  @action
  select(type: 'node' | 'edge', id: string) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    this.selected = [record];
    this.eventBus.emit('node:selected', record.id);
  }

  @action
  pushSelection(type: 'node' | 'edge', id: string) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }
    this.selected = [...this.selected, record];
  }

  @action
  removeSelection(type: 'node' | 'edge', id: string) {
    this.selected = this.selected.filter((r) => r.id !== id);
  }

  @action
  onSidebarInserted(element: HTMLElement) {
    this.sidebarElement = element;
  }

  @action
  onToolbarInserted(element: HTMLElement) {
    this.toolbarElement = element;
  }

  @action
  confirmDeleteNodes(nodeIds: string[]) {
    if (nodeIds.length > 1) {
      return confirm(this.intl.t('models.nodes.delete.confirmation.multiple'));
    }

    if (nodeIds.length === 0) {
      return false;
    }
    const node = this.store.peekRecord<Node>('node', nodeIds[0]!);

    if ([NodeType.Agent, NodeType.Folder].includes(node!.type)) {
      return confirm(
        this.intl.t('models.nodes.delete.confirmation.single', {
          name: node!.name,
        }),
      );
    }

    return true;
  }

  private saveRecord(record: Model, rawData: any) {
    const data = this.assignRelationships(record, rawData);
    Object.assign(record, data);
    return record.save();
  }

  private assignRelationships(record: Model, rawData: any) {
    const data = { ...rawData };
    record.eachRelationship((key: string, schema: LegacyRelationshipSchema) => {
      if (schema.kind === 'belongsTo') {
        const keyWithId = `${key}Id`;
        if (keyWithId in rawData) {
          const value = rawData[keyWithId];
          if (value) {
            data[key] = this.store.peekRecord(schema.type, value);
          } else if (value === null) {
            data[key] = null;
          }
          delete data[keyWithId];
        }
      }
    });

    return data;
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:ember-react-connector')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('ember-react-connector') declare altName: EmberReactConnectorService;`.
declare module '@ember/service' {
  interface Registry {
    'ember-react-connector': EmberReactConnectorService;
  }
}
