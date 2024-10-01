import { action } from '@ember/object';
import Component from '@glimmer/component';
import Edge from 'hcu-urban-model-builder-client/models/edge';
import Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType } from 'hcu-urban-model-builder-backend';
import { importSync, moduleExists } from '@embroider/macros';
import { ensureSafeComponent } from '@embroider/util';
import { dasherize } from '@ember/string';

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
    try {
      const fileName = dasherize(NodeType[this.args.record.type]!);
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

  @action
  async onSave() {
    await this.args.record.save();
  }
}
