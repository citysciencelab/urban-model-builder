import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { A } from '@ember/array';
import { next } from '@ember/runloop';
import { formulaCollection } from 'hcu-urban-model-builder-client/config/formula-collection';
import { isEmpty } from '@ember/utils';

interface Formula {
  name: string;
  formula: string;
  description: string;
}

type FormulaCollection = Record<string, Formula[]>;

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
  @tracked filterValue = '';
  formulas: FormulaCollection = formulaCollection;

  get inputEl() {
    return document.getElementById(this.args.el.id) as HTMLInputElement;
  }

  get filteredFormulas() {
    if (!isEmpty(this.filterValue)) {
      const formulaCollection = this.formulas;
      const filteredFormulas: FormulaCollection = {};
      for (const category in formulaCollection) {
        const formulas = formulaCollection[category];
        if (formulas) {
          const filtered = formulas.filter((formula) =>
            formula.name.toLowerCase().includes(this.filterValue.toLowerCase()),
          );
          if (filtered.length > 0) {
            filteredFormulas[category] = filtered;
          }
        }
      }
      return filteredFormulas;
    }
    return formulaCollection;
  }

  @action async didInsert() {
    const targetEdges = await this.args.node.targetEdges;
    for (const edge of targetEdges) {
      const source = await edge.source;
      this.sourceNodes = [...this.sourceNodes, source];
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
        this.warnings = [
          ...this.warnings,
          `[${match}] not found as a linked node`,
        ];
      }
    }
  }

  @action insertNodeTemplate(node: Node) {
    const text = `[${node.name}]`;
    this._insertText(text);
  }

  @action insertFormula(
    formula: {
      name: string;
      formula: string;
      description: string;
    },
    dd: { actions: { close: () => void } },
  ) {
    dd.actions.close();
    const text = formula.formula;
    this._insertText(text);
  }

  @action clearFilter() {
    this.filterValue = '';
  }

  _insertText(textPart: string) {
    const input = this.inputEl;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentText = input.value;
      input.value =
        currentText.slice(0, start) + textPart + currentText.slice(end);
      input.selectionStart = input.selectionEnd = start + textPart.length;
      next(() => {
        input.focus();
        input.selectionStart = start;
      });
    }
  }
}
