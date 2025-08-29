import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import lookupValidator from 'ember-changeset-validations';
import modelValidator from 'hcu-urban-model-builder-client/validations/model';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type IntlService from 'ember-intl/services/intl';

export interface SidebarGeneralViewsModelInfoSignature {
  // The arguments accepted by the component
  Args: {
    onShowSettingsDialog: (value: boolean) => void;
    modelVersion: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SidebarGeneralViewsModelInfoComponent extends Component<SidebarGeneralViewsModelInfoSignature> {
  @service declare intl: IntlService;

  @tracked record: ModelModel | null = null;
  @tracked changeset: TrackedChangeset<ModelModel> | null = null;

  // OGC Endpoints management
  @tracked showAddModal = false;
  @tracked newEndpointName = '';
  @tracked newEndpointUrl = '';

  get validator() {
    return lookupValidator(modelValidator(this.intl));
  }

  @action onAutoSave() {
    if (this.changeset?.isDirty) {
      this.changeset.saveTask.perform();
    }
  }

  @action async initialize() {
    this.record = await this.args.modelVersion.model;
    this.changeset = new TrackedChangeset(this.record!, this.validator);

    // Initialize ogcEndpoints if not present
    if (!this.args.modelVersion.ogcEndpoints || this.args.modelVersion.ogcEndpoints.length === 0) {
      const defaultEndpoints = [
        {
          id: 'hamburg-api',
          name: 'Hamburg Open Data API',
          baseUrl: 'https://api.hamburg.de/datasets/v1',
          isDefault: true
        }
      ];

      this.args.modelVersion.ogcEndpoints = defaultEndpoints;

      // Save the model version to persist the default endpoint
      try {
        await this.args.modelVersion.save();
      } catch (error) {
        console.error('Error saving default OGC endpoint:', error);
      }
    }
  }  @action showAddEndpointModal() {
    this.showAddModal = true;
    this.newEndpointName = '';
    this.newEndpointUrl = '';
  }

  @action closeAddEndpointModal() {
    this.showAddModal = false;
    this.newEndpointName = '';
    this.newEndpointUrl = '';
  }

  @action updateEndpointName(event: Event) {
    const target = event.target as HTMLInputElement;
    this.newEndpointName = target.value;
  }

  @action updateEndpointUrl(event: Event) {
    const target = event.target as HTMLInputElement;
    this.newEndpointUrl = target.value;
  }

  @action async addOgcEndpoint() {
    if (!this.newEndpointName || !this.newEndpointUrl) {
      return;
    }

    const newEndpoint = {
      id: `custom-${Date.now()}`,
      name: this.newEndpointName,
      baseUrl: this.newEndpointUrl,
      isDefault: false
    };

    // Get current endpoints and ensure it's an array
    const currentEndpoints = this.args.modelVersion.ogcEndpoints || [];

    // Create new array with the added endpoint
    const newEndpointsArray = [...currentEndpoints, newEndpoint];

    // Set the new array
    this.args.modelVersion.ogcEndpoints = newEndpointsArray;

    try {
      await this.args.modelVersion.save();
      // Reset form and hide it
      this.closeAddEndpointModal();
    } catch (error) {
      console.error('Error saving OGC endpoint:', error);
      // Restore the original array if save failed
      this.args.modelVersion.ogcEndpoints = currentEndpoints;
    }
  }  @action async removeOgcEndpoint(index: number) {
    const currentEndpoints = this.args.modelVersion.ogcEndpoints || [];
    const endpoint = currentEndpoints[index];

    // Don't allow removing default endpoint or invalid index
    if (!endpoint || endpoint.isDefault) return;

    // Create new array without the removed endpoint
    const newEndpoints = currentEndpoints.filter((_, i) => i !== index);
    this.args.modelVersion.ogcEndpoints = newEndpoints;

    try {
      await this.args.modelVersion.save();
    } catch (error) {
      console.error('Error removing OGC endpoint:', error);
      // Restore the original array if save failed
      this.args.modelVersion.ogcEndpoints = currentEndpoints;
    }
  }
}
