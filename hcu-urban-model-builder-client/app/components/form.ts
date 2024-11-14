import { action } from '@ember/object';
import Component from '@glimmer/component';
import Edge from 'hcu-urban-model-builder-client/models/edge';
import Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType } from 'hcu-urban-model-builder-backend';
import { importSync } from '@embroider/macros';
import { ensureSafeComponent } from '@embroider/util';
import { dasherize } from '@ember/string';
import { tracked } from '@glimmer/tracking';
import { Value } from '@sinclair/typebox/value';
import { task, timeout } from 'ember-concurrency';
import { deepTracked } from 'ember-deep-tracked';
import lookupValidator from 'ember-changeset-validations';
import nodeValidator from 'hcu-urban-model-builder-client/validations/node-validator';

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

type Errors = {
  [key: string]: string;
};

export default class FormComponent extends Component<FormSignature> {
  readonly DEBOUNCE_MS = 250;

  @tracked changesetBeforeHash: bigint | null = null;
  @tracked record: Node | Edge | null = null;
  @tracked changeset: Node | Edge | null = null;
  @tracked isGhostNode = false;
  @tracked _errors: Errors = {};

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

  createChangeset(record: Record<string, any>) {
    const attrData: any = {};
    for (const [attrKey] of Node.attributes) {
      attrData[attrKey] = record[attrKey];
    }

    return deepTracked(Value.Clone(attrData));
  }

  @action
  onIsDirtyChanged() {
    if (this.isDirty) {
      this.saveTask.perform();
    }
  }

  get errors() {
    return this._errors;
  }

  validate() {
    let hasError = false;
    this._errors = {};
    for (const [key, value] of Object.entries(this.changeset)) {
      const msg = this.validator({
        key: key,
        newValue: value,
        oldValue: (this.record as any)[key],
        changes: {}, // TODO: implement changes
        content: this.changeset,
      });
      if (msg != true) {
        hasError = true;
        for (const error of msg) {
          if (typeof error === 'string') {
            this._errors = { ...this._errors, [key]: error };
          } else if (typeof error === 'object') {
            this._errors = { ...this._errors, [key]: error };
          } else {
            throw new Error('Unexpected return value from validation');
          }
        }
      }
    }
    return hasError;
  }

  saveTask = task({ restartable: true }, async () => {
    const hasError = this.validate();

    if (hasError) {
      return;
    }

    if (!this.isDirty) {
      return;
    }

    await timeout(this.DEBOUNCE_MS);

    if (!this.isDirty) {
      return;
    }

    await this.finalSaveTask.perform();
  });

  finalSaveTask = task({ enqueue: true }, async () => {
    Object.assign(this.record!, Value.Clone(this.changeset));

    await this.record!.save();
    this.changesetBeforeHash = Value.Hash({ ...this.changeset });
  });
}
