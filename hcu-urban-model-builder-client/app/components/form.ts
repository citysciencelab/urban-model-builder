import { action } from '@ember/object';
import Component from '@glimmer/component';
import Edge from 'hcu-urban-model-builder-client/models/edge';
import Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType } from 'hcu-urban-model-builder-backend';
import { importSync } from '@embroider/macros';
import { ensureSafeComponent } from '@embroider/util';
import { dasherize, decamelize } from '@ember/string';
import { tracked } from '@glimmer/tracking';
import lookupValidator from 'ember-changeset-validations';
import nodeValidator from 'hcu-urban-model-builder-client/validations/node-validator';
import { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';
import { service } from '@ember/service';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';

export interface FormSignature {
  // The arguments accepted by the component
  Args: {
    record: Node | Edge;
    close: () => void;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class FormComponent extends Component<FormSignature> {
  private readonly DEBOUNCE_MS = 250;

  @tracked record: Node | Edge | null = null;
  @tracked changeset: TrackedChangeset<Edge | Node> | null = null;
  @tracked isGhostNode = false;
  @tracked isEditMode = false;

  validator = lookupValidator(nodeValidator);
  @service declare eventBus: EventBus;
  @service declare emberReactConnector: EmberReactConnectorService;

  get NodeType() {
    return NodeType;
  }

  get primitiveTypeLabel() {
    if (!(this.record instanceof Node)) {
      return null;
    }
    return decamelize(NodeType[this.record.type]!);
  }

  get primitiveTypeIcon() {
    if (!(this.record instanceof Node)) {
      return null;
    }

    return {
      [NodeType.Stock]: 'inventory',
      [NodeType.Variable]: 'category',
      [NodeType.Flow]: 'flow-icon',
      [NodeType.Converter]: 'autorenew',
      [NodeType.State]: 'toggle_off',
      [NodeType.Transition]: 'transition_push',
      [NodeType.Action]: 'play_pause',
      [NodeType.Population]: 'groups',
      [NodeType.Agent]: 'person',
      [NodeType.Folder]: 'folder',
      [NodeType.Ghost]: 'ghost',
      [NodeType.OgcApiFeatures]: 'storage',
    }[this.record.type] || 'help';
  }

  get nodeFormFieldsComponent() {
    if (!this.record) {
      return null;
    }
    try {
      const fileName = dasherize(NodeType[this.record.type]!);
      const module = importSync(`./node-form-fields/${fileName}`) as any;

      return ensureSafeComponent(module.default, this);
    } catch (e) {
      console.debug(e);
      return null;
    }
  }

  get type() {
    if (this.args.record instanceof Node) {
      return 'node';
    } else if (this.args.record instanceof Edge) {
      return 'edge';
    }
    return null;
  }

  get name() {
    if (this.record instanceof Node) {
      if (this.isGhostNode) {
        return `Ghost: ${this.record.name}`;
      } else {
        return this.record.name;
      }
    }
  }

  get isDirty() {
    if (!this.changeset) {
      return false;
    }

    return this.changeset.isDirty;
  }

  get errors() {
    return this.changeset?._errors;
  }

  get hasErrors() {
    return Object.keys(this.errors || {}).length > 0;
  }

  @action
  async initialize() {
    this.record = await this.getRecord();
    this.changeset = new TrackedChangeset(this.record!, this.validator);
  }

  async getRecord() {
    const record = this.args.record;
    if (record instanceof Node) {
      this.isGhostNode = record.isGhost;
      if (this.isGhostNode) {
        return record.ghostParent;
      }
      return record;
    } else {
      return record;
    }
  }

  @action
  async onIsDirtyChanged() {
    if (this.changeset?.isDirty) {
      await this.changeset.saveTask.perform();
      this.eventBus.emit('model:validate');
    }
  }

  get modelValidationError() {
    return this.record?.id
      ? this.emberReactConnector.validationErrors[this.record.id]
      : null;
  }

  @action
  deleteNode() {
    if (this.record instanceof Node) {
      this.record.deleteRecord();
      this.record.save();
      this.args.close();
    }
  }

  @action
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
  }
}
