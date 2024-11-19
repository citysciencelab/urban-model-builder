import { action } from '@ember/object';
import Component from '@glimmer/component';
import Edge from 'hcu-urban-model-builder-client/models/edge';
import Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType } from 'hcu-urban-model-builder-backend';
import { importSync } from '@embroider/macros';
import { ensureSafeComponent } from '@embroider/util';
import { dasherize } from '@ember/string';
import { tracked } from '@glimmer/tracking';
import lookupValidator from 'ember-changeset-validations';
import nodeValidator from 'hcu-urban-model-builder-client/validations/node-validator';
import { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';

export interface FormSignature {
  // The arguments accepted by the component
  Args: {
    record: Node | Edge;
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

  @tracked changesetBeforeHash: bigint | null = null;
  @tracked record: Node | Edge | null = null;
  @tracked trackedChangeset: TrackedChangeset<Edge | Node> | null = null;
  @tracked isGhostNode = false;

  validator = lookupValidator(nodeValidator);

  get NodeType() {
    return NodeType;
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

  get changeset() {
    return this.trackedChangeset?.data ?? null;
  }

  get isDirty() {
    if (!this.trackedChangeset) {
      return false;
    }

    return this.trackedChangeset.isDirty;
  }

  get errors() {
    return this.trackedChangeset?._errors;
  }

  @action
  async initialize() {
    this.record = await this.getRecord();
    this.trackedChangeset = new TrackedChangeset(this.record!, this.validator);
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
  onIsDirtyChanged() {
    if (this.trackedChangeset?.isDirty) {
      this.trackedChangeset.saveTask.perform();
    }
  }
}
