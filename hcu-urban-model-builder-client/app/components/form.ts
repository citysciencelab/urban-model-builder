import { action } from '@ember/object';
import Component from '@glimmer/component';
import Edge from 'hcu-urban-model-builder-client/models/edge';
import Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType } from 'hcu-urban-model-builder-backend';
import { importSync } from '@embroider/macros';
import { ensureSafeComponent } from '@embroider/util';
import { dasherize } from '@ember/string';
import { tracked } from '@glimmer/tracking';
import { TrackedObject } from 'tracked-built-ins';
import { Value } from '@sinclair/typebox/value';
import { task, timeout } from 'ember-concurrency';

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
  readonly DEBOUNCE_MS = 250;

  @tracked changesetBeforeHash: bigint | null = null;
  @tracked record: Node | Edge | null = null;
  @tracked changeset: TrackedObject | null = null;
  @tracked isGhostNode = false;

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

  get isDirty() {
    if (!this.changeset) {
      return false;
    }

    return this.changesetBeforeHash !== Value.Hash(this.changeset);
  }

  @action
  async initialize() {
    this.record = await this.getRecord();

    this.changeset = this.createChangeset(this.record!);

    this.changesetBeforeHash = Value.Hash({ ...this.changeset });
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

  createChangeset(record: Node | Edge) {
    const attrData: any = {};
    for (const [attrKey] of Node.attributes) {
      console.log('attr', attrKey);
      attrData[attrKey] = (record as any)[attrKey];
    }
    console.log('attrData', attrData);

    return new TrackedObject(structuredClone(attrData));
  }

  @action
  onIsDirtyChanged() {
    console.log('maybeSave', arguments);
    if (this.isDirty) {
      this.saveTask.perform();
    }
  }

  saveTask = task({ restartable: true }, async () => {
    if (!this.isDirty) {
      return;
    }

    await timeout(this.DEBOUNCE_MS);

    if (!this.isDirty) {
      return;
    }

    Object.assign(this.record!, this.changeset);
    await this.record!.save();
  });

  @action
  async onSave() {
    if (!this.record) {
      throw new Error('No record to save');
    }
    Object.assign(this.record, this.changeset);
    await this.record.save();
  }
}
