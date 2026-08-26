import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import type Store from '@ember-data/store';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import { EdgeType, NodeType } from 'hcu-urban-model-builder-backend';

export interface NodeFormFieldsSubModelSignature {
  Args: { node: Node; changeset: any; modelsVersion: ModelsVersion };
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

  @action
  async loadModels() {
    await this.loadModelsForScope();
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
      const parameters = sourceNodes.filter((node) => node.isParameter);
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
        },
      });

      for (const [index, parameter] of parameters.entries()) {
        const sourceData = parameter.data as Record<string, any>;
        const value = sourceData.value ?? sourceData.initial ?? sourceData.rate ?? sourceData.startActive ?? '0';
        const input = (await this.emberReactConnector.create('node', {
          type: NodeType.Variable,
          name: parameter.name,
          description: parameter.description,
          position: { x: 20 + index * 90, y: 25 },
          parentId: folder.id,
          width: 160,
          height: 70,
          data: { value: String(value), units: sourceData.units || 'Unitless', subModelParameterNodeId: parameter.id },
          isParameter: true,
          parameterType: parameter.parameterType,
          parameterMin: parameter.parameterMin,
          parameterMax: parameter.parameterMax,
          parameterStep: parameter.parameterStep,
          parameterOptions: parameter.parameterOptions,
          isOutputParameter: false,
        })) as Node;
        await this.emberReactConnector.create('edge', {
          type: EdgeType.Link,
          sourceId: input.id,
          targetId: subModel.id,
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          points: null,
        });
      }
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

  private saveSelection() {
    if (!this.selectedModel) return;
    this.args.changeset.dataProxy.data = {
      ...(this.args.changeset.dataProxy.data || {}),
      modelId: this.selectedModel.id,
      modelVersionId: this.selectedVersion?.id || null,
    };
  }
}
