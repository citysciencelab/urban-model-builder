import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type RouterService from '@ember/routing/router-service';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import { tracked } from '@glimmer/tracking';

export interface SidebarGeneralViewsShareSignature {
  // The arguments accepted by the component
  Args: {
    modelVersion: ModelsVersion;
    onShowSimulateDialog: (value: boolean) => void;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralViewsShareComponent extends Component<SidebarGeneralViewsShareSignature> {
  @service declare modelDialogs: ModelDialogsService;
  @service declare feathers: FeathersService;
  @service declare router: RouterService;

  @tracked isExporting = false;
  @tracked isImporting = false;
  @tracked importExportError: string | null = null;

  importInputId = 'model-json-import-input';

  get nextVersionString() {
    const mv = this.args.modelVersion;
    return `v${mv.majorVersion}.${mv.minorVersion}.${mv.draftVersion + 1}`;
  }

  @action async onCreateNewDraftVersion() {
    const currentModel = await this.args.modelVersion.model;

    const newDraftModelVersion = await this.feathers.app
      .service('models')
      .newDraft({ id: currentModel!.id! });

    const newDraftModelVersionModel = this.feathers.pushRecordIntoStore(
      'models-version',
      newDraftModelVersion,
    );

    await this.router.transitionTo(
      'models.versions.show',
      newDraftModelVersionModel,
    );
  }

  @action triggerImport() {
    const input = document.getElementById(this.importInputId) as
      | HTMLInputElement
      | null;
    input?.click();
  }

  @action async onExportModel() {
    if (!this.args.modelVersion.canShare) {
      return;
    }

    this.isExporting = true;
    this.importExportError = null;

    try {
      // Whole-model export includes the parent model plus every version and its graph data.
      const model = await this.args.modelVersion.model;
      const payload = await (this.feathers.app.service('models') as any).exportModel({
        id: model!.id,
      });

      const fileName = `${(model?.internalName ?? 'model')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'model'}.json`;
      this.downloadJson(payload, fileName);
    } catch (error) {
      console.error(error);
      this.importExportError = 'Export failed. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  @action async onExportModelVersion() {
    if (!this.args.modelVersion.canEdit) {
      return;
    }

    this.isExporting = true;
    this.importExportError = null;

    try {
      // Version export is limited to the selected draft/published version and its graph data.
      const payload = await (this.feathers.app.service(
        'models-versions',
      ) as any).exportVersion({
        id: this.args.modelVersion.id,
      });

      const fileName = `${this.args.modelVersion.versionString.replace(
        /[^a-z0-9-_.]+/gi,
        '-',
      )}.json`;
      this.downloadJson(payload, fileName);
    } catch (error) {
      console.error(error);
      this.importExportError = 'Version export failed. Please try again.';
    } finally {
      this.isExporting = false;
    }
  }

  @action async onImportFileSelected(event: Event) {
    if (!this.args.modelVersion.canCreateNewDraft) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.isImporting = true;
    this.importExportError = null;

    try {
      const rawPayload = JSON.parse(await file.text());
      const currentModel = await this.args.modelVersion.model;
      // Importing into a version now creates a fresh draft first so the current
      // version remains unchanged and the imported graph lives in its own subversion.
      const newDraftModelVersion = await this.feathers.app
        .service('models')
        .newDraft({ id: currentModel!.id! });

      const result = await (this.feathers.app.service(
        'models-versions',
      ) as any).importVersion({
        id: newDraftModelVersion.id,
        payload: rawPayload,
      });

      const importedVersion = this.feathers.pushRecordIntoStore(
        'models-version',
        result,
      );

      await this.router.transitionTo('models.versions.show', importedVersion);
    } catch (error) {
      console.error(error);
      this.importExportError =
        'Import failed. Please check the JSON file.';
    } finally {
      input.value = '';
      this.isImporting = false;
    }
  }

  private downloadJson(payload: unknown, fileName: string) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
