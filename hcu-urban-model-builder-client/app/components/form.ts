import { action } from '@ember/object';
import Component from '@glimmer/component';
import Edge from 'hcu-urban-model-builder-client/models/edge';
import Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType } from 'hcu-urban-model-builder-backend';
import { importSync } from '@embroider/macros';
import { ensureSafeComponent } from '@embroider/util';
import { dasherize } from '@ember/string';
import { cached } from '@glimmer/tracking';
import { TrackedAsyncData } from 'ember-async-data';

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

  get isGhostNode(): boolean {
    return (
      this.args.record instanceof Node &&
      this.args.record.type === NodeType.Ghost
    );
  }

  @cached
  get ghostParent() {
    if (!this.isGhostNode) {
      return null;
    }
    const getGhostParent = async () => {
      return (this.args.record as Node).ghostParent;
    };
    return new TrackedAsyncData<Node | null>(getGhostParent());
  }

  get record() {
    if (this.isGhostNode) {
      return this.ghostParent?.value && this.ghostParent.isResolved
        ? this.ghostParent.value
        : null;
    }
    return this.args.record;
  }

  get name() {
    if (this.isGhostNode && this.ghostParent?.value) {
      return `Ghost: ${this.ghostParent.value.name}`;
    } else if (this.args.record instanceof Node) {
      return this.args.record.name;
    }
  }

  @action
  async onSave() {
    if (!this.record) {
      throw new Error('No record to save');
    }

    await this.record.save();
  }
}
