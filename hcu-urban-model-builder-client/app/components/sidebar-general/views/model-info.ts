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
import {
  DEFAULT_OGC_ENDPOINT,
  type OgcApiType,
  type OgcEndpoint,
} from 'hcu-urban-model-builder-backend';

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
  @tracked isCheckingApiType = false;
  @tracked detectedApiType: OgcApiType | null = null;
  @tracked apiTypeError: string | null = null;
  @tracked endpointSaveError: string | null = null;

  private apiTypeCheckTimer: ReturnType<typeof setTimeout> | null = null;

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
  }

  // versions created before endpoints were configurable use the default endpoint
  get ogcEndpoints(): OgcEndpoint[] {
    const endpoints = this.args.modelVersion.ogcEndpoints;
    return endpoints && endpoints.length > 0
      ? endpoints
      : [DEFAULT_OGC_ENDPOINT];
  }

  @action showAddEndpointModal() {
    this.showAddModal = true;
    this.newEndpointName = '';
    this.newEndpointUrl = '';
    this.detectedApiType = null;
    this.apiTypeError = null;
    this.isCheckingApiType = false;
  }

  @action closeAddEndpointModal() {
    this.showAddModal = false;
    this.newEndpointName = '';
    this.newEndpointUrl = '';
    this.detectedApiType = null;
    this.apiTypeError = null;
    this.isCheckingApiType = false;
  }

  @action updateEndpointName(event: Event) {
    const target = event.target as HTMLInputElement;
    this.newEndpointName = target.value;
  }

  @action updateEndpointUrl(event: Event) {
    const target = event.target as HTMLInputElement;
    this.newEndpointUrl = target.value;

    // Clear previous detection results
    this.detectedApiType = null;
    this.apiTypeError = null;

    // Clear existing timer
    if (this.apiTypeCheckTimer) {
      clearTimeout(this.apiTypeCheckTimer);
    }

    // Trigger API type detection with debounce if URL looks valid
    if (this.newEndpointUrl && this.isValidUrl(this.newEndpointUrl)) {
      this.apiTypeCheckTimer = setTimeout(() => {
        this.detectApiType();
      }, 1000); // 1 second debounce
    }
  }

  /**
   * Validates if the given string is a valid URL
   */
  private isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detects the type of OGC API by making a request to the endpoint
   */
  @action async detectApiType() {
    if (!this.newEndpointUrl || this.isCheckingApiType) {
      return;
    }

    this.isCheckingApiType = true;
    this.apiTypeError = null;

    try {
      const response = await fetch(this.newEndpointUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check if the response contains an array of APIs (multi-api)
      // Example: https://api.hamburg.de/datasets/v1
      if (Array.isArray(data.apis) && data.apis.length > 0) {
        this.detectedApiType = 'multi-api';
      }
      // Check if the response contains collections (single-api)
      // Example: https://api.pdok.nl/lv/bgt/ogc/v1/ or https://gis.lfrz.gv.at/api/geodata/i009501/ogc/features/v1/
      else if (
        data.collections ||
        (data.links && Array.isArray(data.links)) ||
        (data.conformsTo && Array.isArray(data.conformsTo)) ||
        data.title ||
        data.description
      ) {
        this.detectedApiType = 'single-api';
      }
      // If neither, mark as unknown
      else {
        this.detectedApiType = 'unknown';
      }
    } catch (error) {
      this.apiTypeError =
        error instanceof Error
          ? error.message
          : this.intl.t('components.model_info.api_type_error_default');
      this.detectedApiType = null;
    } finally {
      this.isCheckingApiType = false;
    }
  }

  @action async addOgcEndpoint() {
    if (!this.newEndpointName || !this.newEndpointUrl) {
      return;
    }

    const newEndpoint: OgcEndpoint = {
      id: `custom-${Date.now()}`,
      name: this.newEndpointName,
      baseUrl: this.newEndpointUrl,
      isDefault: false,
      apiType: this.detectedApiType || 'unknown',
    };

    // based on this.ogcEndpoints, so the default endpoint is kept for older versions
    const saved = await this.saveOgcEndpoints([
      ...this.ogcEndpoints,
      newEndpoint,
    ]);
    if (saved) {
      this.closeAddEndpointModal();
    }
  }

  @action async removeOgcEndpoint(index: number) {
    const endpoint = this.ogcEndpoints[index];

    // Don't allow removing default endpoint or invalid index
    if (!endpoint || endpoint.isDefault) return;

    await this.saveOgcEndpoints(
      this.ogcEndpoints.filter((_, i) => i !== index),
    );
  }

  private async saveOgcEndpoints(endpoints: OgcEndpoint[]) {
    const previousEndpoints = this.args.modelVersion.ogcEndpoints;
    this.args.modelVersion.ogcEndpoints = endpoints;
    this.endpointSaveError = null;

    try {
      await this.args.modelVersion.save();
      return true;
    } catch (error) {
      // restore the previous endpoints if saving failed
      this.args.modelVersion.ogcEndpoints = previousEndpoints;
      this.endpointSaveError =
        error instanceof Error ? error.message : String(error);
      return false;
    }
  }
}
