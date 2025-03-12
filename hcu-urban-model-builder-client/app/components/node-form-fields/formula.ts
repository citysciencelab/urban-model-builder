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
  // FIXME: i18n ⚡️ impact on functionality expected
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

  @action
  async loadSourceNodes() {
    this.sourceNodes = await this.getSourceNodes(this.args.node);

    this.checkForIssues();
  }

  async getSourceNodes(node: Node) {
    const sourceNodes: Node[] = [];
    const targetEdges = await node.targetEdgesWithGhosts;
    for (const edge of targetEdges) {
      const source = await edge.source;
      if (source?.isGhost) {
        const ghostParent = await source.ghostParent;
        if (ghostParent) {
          sourceNodes.push(ghostParent);
        }
      } else if (source) {
        sourceNodes.push(source);
      }
    }
    return sourceNodes;
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
    this._insertText(text, true);
  }

  @action clearFilter() {
    this.filterValue = '';
  }

  _replaceFirstParameter(formula: string, replacement: string) {
    // Find the first opening and closing parentheses
    const start = formula.indexOf('(') + 1;
    const end =
      formula.indexOf(',', start) !== -1
        ? formula.indexOf(',', start)
        : formula.indexOf(')', start);

    // If no parameter is found, return the formula as-is
    if (start === -1 || end === -1) return formula;

    // Create a new formula by replacing the first parameter with the replacement value
    const newFormula =
      formula.slice(0, start) + replacement + formula.slice(end);

    // Return the modified formula and the offsets of the first parameter
    return newFormula;
  }

  _countParameters(formula: string) {
    // Find the positions of the first opening and closing parentheses
    const start = formula.indexOf('(');
    const end = formula.indexOf(')', start);

    // If no parameters section is found, return 0
    if (start === -1 || end === -1) return 0;

    // Extract the parameter substring
    const parametersSection = formula.slice(start + 1, end).trim();

    // If the parameter section is empty, return 0
    if (!parametersSection) return 0;

    // Split parameters by commas, ignoring extra spaces, and count them
    const parameters = parametersSection
      .split(',')
      .map((param) => param.trim());
    return parameters.length;
  }

  _getParameterOffset(formula: string, paramIndex: number) {
    // Find the positions of the opening and closing parentheses
    const start = formula.indexOf('(');
    const end = formula.indexOf(')', start);

    // If parentheses are not found, return null
    if (start === -1 || end === -1) return null;

    // Extract the parameter substring
    const parametersSection = formula.slice(start + 1, end).trim();

    // Split parameters by commas, ignoring extra spaces
    const parameters = parametersSection
      .split(',')
      .map((param) => param.trim());

    // Check if the parameter index is valid
    if (paramIndex < 0 || paramIndex >= parameters.length) return null;

    // Calculate the start offset and length of the parameter at the specified index
    let currentPos = start + 1;
    for (let i = 0; i < paramIndex; i++) {
      currentPos += parameters[i]!.length + 1; // Move past parameter and comma
    }
    const paramStart = currentPos;
    const paramLength = parameters[paramIndex]!.length;

    // Return an object with the start and length of the parameter
    return { start: paramStart, length: paramLength };
  }

  _insertText(textPart: string, isFormula = false) {
    const input = this.inputEl;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentText = input.value;

      const paramCount = this._countParameters(textPart);
      const isWrap = isFormula && start != end && paramCount > 0;

      if (isWrap) {
        // when there is something selected, we assume the user wants to wrap the selection
        // into the formula, so we ensure that the formula has at least one parameter
        // and replace the first parameter with the selected text before inserting the
        // formula, we try to highlight the second parameter or as fallback
        // we set the cursor to after the insertion
        const formula = this._replaceFirstParameter(
          textPart,
          currentText.slice(start, end),
        );
        input.value =
          currentText.slice(0, start) + formula + currentText.slice(end);

        next(() => {
          input.focus();
          const paramOffset = this._getParameterOffset(formula, 1);
          if (paramCount > 1 && paramOffset) {
            input.selectionStart = start + paramOffset.start + 1;
            input.selectionEnd =
              start + paramOffset.start + paramOffset.length + 1;
          } else {
            input.selectionStart = input.selectionEnd = start + formula.length;
          }
        });
      } else {
        // when not a wrap, we just insert the text at the cursor position
        // when a variable is inserted, we just position the cursor after the variable
        // when a formula is inserted, we try to highlight the first parameter
        input.value =
          currentText.slice(0, start) + textPart + currentText.slice(end);

        next(() => {
          input.focus();
          if (isFormula && paramCount > 0) {
            const paramOffset = this._getParameterOffset(textPart, 0);
            if (paramOffset && paramCount > 0) {
              input.selectionStart = start + paramOffset?.start;
              input.selectionEnd =
                start + paramOffset?.start + paramOffset?.length;
            }
          } else {
            input.selectionStart = input.selectionEnd = start + textPart.length;
          }
        });
      }
      // manually create the change event to trigger the autosave
      const event = new Event('change');
      this.inputEl.dispatchEvent(event);
    }
  }
}
