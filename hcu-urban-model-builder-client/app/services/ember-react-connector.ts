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
import {
  NodeType,
  type Edges,
  type Nodes,
  type SimulationModelData,
} from 'hcu-urban-model-builder-backend';
import { StoreEventSenderTransport } from 'hcu-urban-model-builder-client/services/store-event-emitter';
import type IntlService from 'ember-intl/services/intl';
import type ModelValidationService from './model-validation';
import type { ModelValidationErrors } from './model-validation';
import { createValidationSnapshot } from 'hcu-urban-model-builder-client/utils/validation-snapshot';

export default class EmberReactConnectorService extends Service {
  @service declare applicationState: ApplicationStateService;
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;
  @service declare eventBus: EventBus;
  @service declare intl: IntlService;
  @service declare modelValidation: ModelValidationService;

  @tracked selected: (Node | Edge)[] = [];
  @tracked currentModel: ModelsVersion | null = null;
  @tracked sidebarElement: HTMLElement | null = null;
  @tracked toolbarElement: HTMLElement | null = null;
  @tracked validationErrors: Record<string, string> = {};

  get currentModelVersionId() {
    return this.currentModel!.id;
  }

  @action
  async save(type: 'node' | 'edge', id: string, rawData: any) {
    const record = this.store.peekRecord<Node | Edge>(type, id);
    if (!record) {
      throw new Error(`Node with id ${id} not found`);
    }

    const savedRecord = await this.saveRecord(record, rawData);
    this.storeEventEmitter.emit(type, 'updated', savedRecord as any, StoreEventSenderTransport.LOCAL);
    return savedRecord;
  }

  @action
  async create(type: 'node' | 'edge', rawData: any) {
    const record = this.store.createRecord<Node | Edge>(type, {});

    record.modelsVersions = this.currentModel!;

    const savedRecord = await this.saveRecord(record, rawData);
    // Socket events intentionally ignore records already in Ember Data's store.
    // Tell the React canvas about local creates immediately (not only after a reload).
    this.storeEventEmitter.emit(type, 'created', savedRecord as any, StoreEventSenderTransport.LOCAL);
    return savedRecord;
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

  /**
   * Checks the graph already held in Ember's store; no API reads occur. The
   * simulation runs in a web worker (see the model-validation service), so
   * only the snapshot is built here. Resolves with `null` when the check was
   * superseded by a newer one or the model changed meanwhile.
   */
  @action
  async validateModel(): Promise<ModelValidationErrors | null> {
    const model = this.currentModel;
    if (!model?.id) {
      this.validationErrors = {};
      return {};
    }

    let snapshot: SimulationModelData;
    try {
      const nodes = (await model.nodes).map((node) => {
        return {
          id: node.id!,
          modelsVersionsId: model.id,
          type: node.type,
          name: node.name,
          description: node.description,
          data: node.data,
          position: node.position,
          height: node.height,
          width: node.width,
          parentId: node.parent?.id ?? null,
          ghostParentId: node.ghostParent?.id ?? null,
          isParameter: node.isParameter,
          parameterMin: node.parameterMin ?? null,
          parameterMax: node.parameterMax ?? null,
          parameterStep: node.parameterStep ?? null,
          parameterType: node.parameterType,
          parameterOptions: node.parameterOptions ?? null,
          isOutputParameter: node.isOutputParameter,
        } as Nodes;
      });
      const edges = (await model.edges).map((edge) => {
        return {
          id: edge.id!,
          modelsVersionsId: model.id,
          type: edge.type,
          sourceId: edge.source.id!,
          targetId: edge.target.id!,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          points: edge.points ?? null,
        } as Edges;
      });
      snapshot = createValidationSnapshot(model, nodes, edges);
    } catch (error) {
      console.error('Model validation could not read the model:', error);
      this.validationErrors = {};
      return {};
    }
    if (this.currentModel !== model) {
      return null;
    }

    const errors = await this.modelValidation.validate(model.id, snapshot);
    if (errors === null || this.currentModel !== model) {
      return null;
    }
    this.validationErrors = errors;
    return errors;
  }

  @action
  cancelModelValidation() {
    this.modelValidation.cancel();
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
