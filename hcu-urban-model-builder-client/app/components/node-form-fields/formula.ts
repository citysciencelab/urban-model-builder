import Component from '@glimmer/component';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type Edge from 'hcu-urban-model-builder-client/models/edge';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { A } from '@ember/array';
import { next } from '@ember/runloop';
import { formulaCollection } from 'hcu-urban-model-builder-client/config/formula-collection';
import { isEmpty } from '@ember/utils';
import { service } from '@ember/service';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import { EdgeType, NodeType } from 'hcu-urban-model-builder-backend';

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
  private referenceTimer: ReturnType<typeof setTimeout> | null = null;
  private syncInProgress: Promise<void> | null = null;
  private syncQueued = false;
  @service declare emberReactConnector: EmberReactConnectorService;
  @tracked sourceNodes: Node[] = A([]);
  @tracked warnings: string[] = A([]);
  @tracked pendingVariableName: string | null = null;
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
    const sourceNodes = await this.getSourceNodes(this.args.node);
    if (this.isDestroying) {
      return;
    }

    this.sourceNodes = sourceNodes;
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
    const matches = this.getReferencedNames(this.inputEl?.value || this.args.node.data.value || '');

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

  willDestroy() {
    super.willDestroy();
    if (this.referenceTimer) {
      clearTimeout(this.referenceTimer);
    }
  }

  @action
  scheduleReferenceSync(event?: InputEvent) {
    if (event && event.target !== this.inputEl) {
      return;
    }
    if (this.referenceTimer) {
      clearTimeout(this.referenceTimer);
    }
    this.referenceTimer = setTimeout(() => this.runSyncReferences(), 3000);
  }

  /** Coalesces overlapping sync requests instead of letting them race. */
  private runSyncReferences() {
    if (this.syncInProgress) {
      this.syncQueued = true;
      return;
    }

    this.syncInProgress = this.syncReferences()
      .catch((error) => console.error(error))
      .finally(() => {
        this.syncInProgress = null;
        if (this.syncQueued && !this.isDestroying) {
          this.syncQueued = false;
          this.runSyncReferences();
        }
      });
  }

  @action
  closeCreateVariableModal() {
    this.pendingVariableName = null;
  }

  @action
  async createMissingVariable() {
    const name = this.pendingVariableName;
    if (!name) {
      return;
    }

    const target = this.args.node;
    const source = await this.emberReactConnector.create('node', {
      type: NodeType.Variable,
      name,
      data: { value: '0', units: 'Unitless' },
      position: { x: Math.max(0, target.position.x - 260), y: target.position.y },
      width: 180,
      height: 80,
      isParameter: false,
      isOutputParameter: false,
    }) as Node;

    await this.createReferenceEdge(source, target);
    this.pendingVariableName = null;
    await this.loadSourceNodes();
  }

  private getReferencedNames(text: string) {
    return [...new Set([...text.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]!.trim()))].filter(Boolean);
  }

  private async syncReferences() {
    const target = this.args.node;
    const names = this.getReferencedNames(this.inputEl?.value || '');
    if (names.length === 0) {
      return;
    }

    const modelVersion = await target.modelsVersions;
    if (this.isDestroying) {
      return;
    }
    const modelNodes = await modelVersion.nodes;
    if (this.isDestroying) {
      return;
    }
    await this.removeObsoleteReferenceEdges(target, names);
    if (this.isDestroying) {
      return;
    }
    const linkedSources = await this.getSourceNodes(target);
    if (this.isDestroying) {
      return;
    }
    const missing: string[] = [];

    for (const name of names) {
      const source = modelNodes.find((node) => node.id !== target.id && node.name === name);
      if (!source) {
        missing.push(name);
        continue;
      }
      if (!linkedSources.some((node) => node.id === source.id)) {
        await this.createReferenceEdge(source, target);
        if (this.isDestroying) {
          return;
        }
      }
    }

    await this.loadSourceNodes();
    if (this.isDestroying) {
      return;
    }
    if (missing.length > 0) {
      this.pendingVariableName = missing[0]!;
    }
  }

  private async createReferenceEdge(source: Node, target: Node) {
    const sourceIsArrow = source.type === NodeType.Flow || source.type === NodeType.Transition;
    const targetIsArrow = target.type === NodeType.Flow || target.type === NodeType.Transition;

    await this.emberReactConnector.create('edge', {
      type: EdgeType.Link,
      sourceId: source.id,
      targetId: target.id,
      sourceHandle: sourceIsArrow ? 'source-1' : 'source-right',
      targetHandle: targetIsArrow ? 'target-1' : 'target-left',
      points: null,
      isReference: true,
    });
  }

  /** Keeps only reference edges represented by a [Primitive Name] in the formula. */
  private async removeObsoleteReferenceEdges(target: Node, names: string[]) {
    const targetEdges = await target.targetEdgesWithGhosts;

    for (const edge of targetEdges) {
      // Only edges created by this reference sync are ever auto-removed, so a
      // Link edge the user dragged in manually is never touched here.
      if (edge.type !== EdgeType.Link || !edge.isReference) {
        continue;
      }

      const source = await this.getReferenceSource(edge);
      if (source && !names.includes(source.name)) {
        await this.emberReactConnector.delete('edge', edge.id);
      }
    }
  }

  private async getReferenceSource(edge: Edge) {
    const source = await edge.source;
    return source?.isGhost ? await source.ghostParent : source;
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
      this.scheduleReferenceSync();
    }
  }
}
