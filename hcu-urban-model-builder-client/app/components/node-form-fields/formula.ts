import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { A } from '@ember/array';

export interface NodeFormFieldsFormulaSignature {
  // The arguments accepted by the component
  Args: {
    form: any;
    node: Node;
    el: any;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsFormulaComponent extends Component<NodeFormFieldsFormulaSignature> {
  @tracked sourceNodes: Node[] = A([]);
  @tracked warnings: string[] = A([]);

  @action insertNodeTemplate(node: Node) {
    const input = document.getElementById(this.args.el.id) as HTMLInputElement;
    const text = `[${node.name}]`;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentText = input.value;
      input.value = currentText.slice(0, start) + text + currentText.slice(end);
      input.selectionStart = input.selectionEnd = start + text.length;
      input.focus();
    }
  }

  @action async didInsert() {
    const targetEdges = await this.args.node.targetEdges;
    for (const edge of targetEdges) {
      const source = await edge.source;
      // TODO: typings
      this.sourceNodes.pushObject(source);
    }

    this.checkForIssues();
  }

  @action checkForIssues() {
    this.warnings = A([]);
    const text = this.args.node.data.value || '';
    const matches = [
      ...new Set([...text.matchAll(/\[(.*?)\]/g)].map((match) => match[1])),
    ];

    for (const match of matches) {
      let found = false;
      for (const node of this.sourceNodes) {
        if (node.name === match) {
          found = true;
          break;
        }
      }
      if (!found) {
        this.warnings.pushObject(`[${match}] not found as a linked node`);
      }
    }
  }
}
