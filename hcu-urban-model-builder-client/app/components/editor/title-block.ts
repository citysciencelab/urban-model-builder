import Component from '@glimmer/component';
import { service } from '@ember/service';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type ApplicationStateService from 'hcu-urban-model-builder-client/services/application-state';
import type SaveStatusService from 'hcu-urban-model-builder-client/services/save-status';

export interface EditorTitleBlockSignature {
  Args: {
    modelVersion: ModelsVersion;
  };
  Element: HTMLDivElement;
}

/**
 * The editor's only header (UMB Design System: TitleBlock): a floating title
 * block top left with the way back to the Library, the model name and a meta
 * line with version, state and save status. It replaces the navbar and the
 * centred state badges.
 */
export default class EditorTitleBlockComponent extends Component<EditorTitleBlockSignature> {
  @service declare applicationState: ApplicationStateService;
  @service declare saveStatus: SaveStatusService;

  get isDemo() {
    return !!this.applicationState.isDemoMode;
  }

  get isReadOnly() {
    return !this.isDemo && !this.args.modelVersion.canEdit;
  }

  /** Read-only and demo versions show a chip instead of the save status. */
  get showSaveStatus() {
    return !this.isDemo && !this.isReadOnly;
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Editor::TitleBlock': typeof EditorTitleBlockComponent;
  }
}
