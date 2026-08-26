import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type Edge from 'hcu-urban-model-builder-client/models/edge';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import { EdgeType, NodeType } from 'hcu-urban-model-builder-backend';

export interface NodeFormFieldsSubModelSignature {
  Args: { node: Node; changeset: any; modelsVersion: ModelsVersion; form: any; errors: any; disabled?: boolean };
  Blocks: { default: [] };
  Element: null;
}

export default class NodeFormFieldsSubModelComponent extends Component<NodeFormFieldsSubModelSignature> {
  @service declare store: Store;
  @service declare emberReactConnector: EmberReactConnectorService;

  @tracked scope: 'mine' | 'public' = 'mine';
  @tracked models: ModelModel[] = [];
  @tracked selectedModel: ModelModel | null = null;
  @tracked versions: ModelsVersion[] = [];
  @tracked selectedVersion: ModelsVersion | null = null;
  @tracked isLoading = false;
  @tracked isImporting = false;
  @tracked inputConnections: Record<string, { name: string; value: string } | null> = {};

  get isImported() {
    return Boolean((this.args.node.data as { importedFolderId?: string }).importedFolderId);
  }

  @action
  async loadModels() {
    await this.loadModelsForScope();
  }

  @action
  async loadImportedSelection() {
    const data = this.args.node.data as Record<string, any>;
    if (!data.modelId || !data.modelVersionId) return;
    try {
      this.selectedModel = await this.store.findRecord<ModelModel>('model', data.modelId);
      this.selectedVersion = await this.store.findRecord<ModelsVersion>('models-version', data.modelVersionId);
    } catch {
      // A source model can have been unpublished or deleted. Keep the existing
      // import usable; the user can still select another source model.
      this.selectedModel = null;
      this.selectedVersion = null;
    }
  }

  @action
  async loadInputConnections() {
    const connections: Record<string, { name: string; value: string } | null> = {};
    const edges = await this.args.node.targetEdges;
    for (const edge of edges) {
      if (!edge.targetHandle?.startsWith('submodel-input-')) continue;
      const source = await edge.source;
      if (!source) continue;
      connections[edge.targetHandle.replace('submodel-input-', '')] = {
        name: source.name,
        value: String((source.data as Record<string, any>).value ?? '–'),
      };
    }
    this.inputConnections = connections;
  }

  @action
  inputConnection(input: { id: string }) {
    return this.inputConnections[input.id] || null;
  }

  @action
  async switchScope(scope: 'mine' | 'public') {
    this.scope = scope;
    this.selectedModel = null;
    this.selectedVersion = null;
    this.versions = [];
    await this.loadModelsForScope();
  }

  @action
  async selectModel(model: ModelModel | null) {
    this.selectedModel = model;
    this.selectedVersion = null;
    this.versions = [];
    if (!model) return;

    this.args.changeset.dataProxy.name = model.internalName;
    this.args.changeset.dataProxy.description = model.description || '';
    const versions = await model.modelsVersions;
    this.versions = versions;

    if (this.scope === 'public') {
      this.selectedVersion = (await model.latestPublishedVersion) || null;
      this.saveSelection();
    }
  }

  @action
  selectVersion(version: ModelsVersion | null) {
    this.selectedVersion = version;
    this.saveSelection();
  }

  @action
  async importModel() {
    if (!this.selectedModel || !this.selectedVersion || this.isImporting) return;
    this.isImporting = true;
    try {
      const subModel = this.args.node;
      const sourceNodes = await this.store.query<Node>('node', {
        modelsVersionsId: this.selectedVersion.id,
        $limit: 10000,
      });
      const sourceEdges = await this.store.query<Edge>('edge', {
        modelsVersionsId: this.selectedVersion.id,
        $limit: 10000,
      });
      const parameters = sourceNodes.filter((node) => node.isParameter);
      const outputs = sourceNodes.filter((node) => node.isOutputParameter);
      const folder = (await this.emberReactConnector.create('node', {
        type: NodeType.Folder,
        name: this.selectedModel.internalName,
        description: this.selectedModel.description || '',
        position: { x: Math.max(0, subModel.position.x - 40), y: Math.max(0, subModel.position.y - 80) },
        width: Math.max(360, 220 + parameters.length * 90),
        height: 250,
        data: {},
        isParameter: false,
        isOutputParameter: false,
      })) as Node;

      const visibleInputs = new Map<string, Node>();
      for (const [index, parameter] of parameters.entries()) {
        const sourceData = parameter.data as Record<string, any>;
        const value = this.defaultValue(sourceData);
        const input = (await this.emberReactConnector.create('node', {
          type: NodeType.Variable,
          name: `${this.selectedModel.internalName}: ${parameter.name}`,
          description: parameter.description,
          position: { x: 20 + index * 90, y: 25 },
          parentId: folder.id,
          width: 160,
          height: 70,
          data: { value, units: sourceData.units || 'Unitless', subModelParameterNodeId: parameter.id },
          isParameter: true,
          parameterType: parameter.parameterType,
          parameterMin: parameter.parameterMin,
          parameterMax: parameter.parameterMax,
          parameterStep: parameter.parameterStep,
          parameterOptions: parameter.parameterOptions,
          isOutputParameter: false,
        })) as Node;
        visibleInputs.set(parameter.id!, input);
      }

      const importedNodes = new Map<string, Node>();
      const importedNames = new Map<string, string>();
      for (const sourceNode of sourceNodes) {
        importedNames.set(sourceNode.id!, `${this.selectedModel.internalName} · ${sourceNode.name}`);
      }

      // Create the complete source graph as private simulation data. It remains
      // in this model version, but canvas listeners deliberately never render it.
      for (const sourceNode of sourceNodes) {
        const sourceData = sourceNode.data as Record<string, any>;
        const data = this.rewriteReferences(sourceData, sourceNodes, importedNames);
        const parameterInput = visibleInputs.get(sourceNode.id!);
        if (parameterInput) {
          const key = this.valueKey(sourceNode.type);
          if (key) data[key] = `[${parameterInput.name}]`;
        }
        data.isSubModelInternal = true;
        data.subModelInstanceId = subModel.id;
        data.sourceNodeId = sourceNode.id;
        data.isSubModelOutput = sourceNode.isOutputParameter;

        const importedNode = (await this.emberReactConnector.create('node', {
          type: sourceNode.type,
          name: importedNames.get(sourceNode.id!),
          description: sourceNode.description,
          position: sourceNode.position,
          width: sourceNode.width,
          height: sourceNode.height,
          parentId: folder.id,
          data,
          isParameter: false,
          parameterType: null,
          parameterMin: null,
          parameterMax: null,
          parameterStep: null,
          parameterOptions: null,
          isOutputParameter: false,
          ghostParentId: null,
        })) as Node;
        importedNodes.set(sourceNode.id!, importedNode);
      }

      // Restore internal folders and ghost parents after all clone ids exist.
      for (const sourceNode of sourceNodes) {
        const importedNode = importedNodes.get(sourceNode.id!)!;
        const parentId = sourceNode.parent?.id && importedNodes.get(sourceNode.parent.id)?.id;
        const ghostParentId = sourceNode.ghostParent?.id && importedNodes.get(sourceNode.ghostParent.id)?.id;
        if (parentId || ghostParentId) {
          await this.emberReactConnector.save('node', importedNode.id!, {
            ...(parentId ? { parentId } : {}),
            ...(ghostParentId ? { ghostParentId } : {}),
          });
        }
      }

      for (const sourceEdge of sourceEdges) {
        const sourceId = sourceEdge.source.id;
        const targetId = sourceEdge.target.id;
        const importedSource = sourceId && importedNodes.get(sourceId);
        const importedTarget = targetId && importedNodes.get(targetId);
        if (!importedSource || !importedTarget) continue;
        await this.emberReactConnector.create('edge', {
          type: sourceEdge.type,
          sourceId: importedSource.id,
          targetId: importedTarget.id,
          sourceHandle: sourceEdge.sourceHandle,
          targetHandle: sourceEdge.targetHandle,
          points: sourceEdge.points,
        });
      }

      await this.emberReactConnector.save('node', subModel.id!, {
        name: this.selectedModel.internalName,
        description: this.selectedModel.description || '',
        position: { x: 180, y: 120 },
        parentId: folder.id,
        data: {
          ...(subModel.data || {}),
          modelId: this.selectedModel.id,
          modelVersionId: this.selectedVersion.id,
          importedFolderId: folder.id,
          inputs: parameters.map((node) => ({ id: node.id, name: node.name, defaultValue: this.defaultValue(node.data as Record<string, any>), internalNodeId: importedNodes.get(node.id!)?.id })),
          outputs: outputs.map((node) => ({ id: node.id, name: node.name, internalNodeId: importedNodes.get(node.id!)?.id })),
        },
      });

      for (const parameter of parameters) {
        const input = visibleInputs.get(parameter.id!)!;
        const internalParameter = importedNodes.get(parameter.id!)!;
        // One edge is the visible interface; the other is hidden and supplies the
        // cloned graph during a normal simulation run.
        await this.emberReactConnector.create('edge', {
          type: EdgeType.Link,
          sourceId: input.id,
          targetId: subModel.id,
          sourceHandle: 'source-bottom',
          targetHandle: `submodel-input-${parameter.id}`,
          points: null,
        });
        await this.emberReactConnector.create('edge', {
          type: EdgeType.Link,
          sourceId: input.id,
          targetId: internalParameter.id,
          sourceHandle: 'source-bottom',
          targetHandle: 'target-left',
          points: null,
        });
      }
    } finally {
      this.isImporting = false;
    }
  }

  @action
  async reimportCurrentModel() {
    if (!this.selectedModel || !this.selectedVersion || this.isImporting) return;
    await this.removeImportedGraph();
    await this.importModel();
  }

  @action
  async changeImportedModel() {
    if (this.isImporting) return;
    this.isImporting = true;
    try {
      await this.removeImportedGraph();
      await this.loadModelsForScope();
    } finally {
      this.isImporting = false;
    }
  }

  private async loadModelsForScope() {
    this.isLoading = true;
    try {
      const currentModel = await this.args.modelsVersion.model;
      const models = await this.store.query<ModelModel>('model', {
        [this.scope === 'mine' ? '$me' : '$public']: true,
        $limit: 10000,
      });
      this.models = models.filter((model) => model.id !== currentModel?.id);
    } finally {
      this.isLoading = false;
    }
  }

  private async removeImportedGraph() {
    const folderId = (this.args.node.data as Record<string, any>).importedFolderId;
    if (!folderId) return;
    const allNodes = await this.store.query<Node>('node', {
      modelsVersionsId: this.args.modelsVersion.id,
      $limit: 10000,
    });
    const nodesToDelete = new Map<string, Node>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of allNodes) {
        const parentId = node.parent?.id;
        if (node.id !== this.args.node.id && (node.id === folderId || (parentId && nodesToDelete.has(parentId)))) {
          if (!nodesToDelete.has(node.id!)) {
            nodesToDelete.set(node.id!, node);
            changed = true;
          }
        }
      }
    }
    const edges = await this.store.query<Edge>('edge', { modelsVersionsId: this.args.modelsVersion.id, $limit: 10000 });
    for (const edge of edges) {
      if (nodesToDelete.has(edge.source.id!) || nodesToDelete.has(edge.target.id!)) {
        await this.emberReactConnector.delete('edge', edge.id!);
      }
    }
    // Children first keeps this safe for model versions with parent constraints.
    const orderedNodes = [...nodesToDelete.values()].sort((a, b) => Number(Boolean(b.parent?.id)) - Number(Boolean(a.parent?.id)));
    for (const node of orderedNodes) await this.emberReactConnector.delete('node', node.id!);
    const previousData = this.args.node.data as Record<string, any>;
    await this.emberReactConnector.save('node', this.args.node.id!, {
      parentId: null,
      data: { modelId: previousData.modelId, modelVersionId: previousData.modelVersionId },
    });
  }

  private saveSelection() {
    if (!this.selectedModel) return;
    this.args.changeset.dataProxy.data = {
      ...(this.args.changeset.dataProxy.data || {}),
      modelId: this.selectedModel.id,
      modelVersionId: this.selectedVersion?.id || null,
    };
  }

  private defaultValue(data: Record<string, any>) {
    return String(data.value ?? data.initial ?? data.rate ?? data.startActive ?? '0');
  }

  private valueKey(type: NodeType) {
    if (type === NodeType.Stock) return 'initial';
    if (type === NodeType.Flow) return 'rate';
    if (type === NodeType.State) return 'startActive';
    if (type === NodeType.Transition || type === NodeType.Action || type === NodeType.Variable) return 'value';
    return null;
  }

  private rewriteReferences(value: any, sourceNodes: Node[], importedNames: Map<string, string>): any {
    if (typeof value === 'string') {
      return sourceNodes.reduce((result, node) => result.split(`[${node.name}]`).join(`[${importedNames.get(node.id!)}]`), value);
    }
    if (Array.isArray(value)) return value.map((item) => this.rewriteReferences(item, sourceNodes, importedNames));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.rewriteReferences(item, sourceNodes, importedNames)]));
    }
    return value;
  }
}
