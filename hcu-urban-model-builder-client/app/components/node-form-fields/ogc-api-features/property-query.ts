import { cached } from '@ember-data/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { isBlank } from '@ember/utils';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { TrackedAsyncData } from 'ember-async-data';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type OgcApiFeaturesService from 'hcu-urban-model-builder-client/services/ogc-api-features';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';

export interface NodeFormFieldsOgcApiFeaturesPropertyQuerySignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsOgcApiFeaturesPropertyQueryComponent extends Component<NodeFormFieldsOgcApiFeaturesPropertyQuerySignature> {
  @service declare ogcApiFeatures: OgcApiFeaturesService;

  @tracked selectedNewQueryProperty: { id: string; type: string } | null = null;
  @tracked newQueryValue: string | number | null = null;

  @cached
  get collectionId() {
    return this.args.changeset.dataProxy.data.collectionId;
  }

  @cached
  get queryableProperties() {
    const apiId = this.args.changeset.dataProxy.data.apiId;
    const collectionId = this.collectionId;
    const fetch = async () => {
      if (!apiId || !collectionId) {
        return null;
      }

      const res = await this.ogcApiFeatures.getQueryableProperties(
        apiId,
        collectionId,
      );

      return Object.entries(res).map(([id, value]) => ({
        id,
        ...value,
      }));
    };

    return new TrackedAsyncData(fetch());
  }

  get query() {
    return this.args.changeset.dataProxy.data.query as Record<string, any>;
  }

  set query(value) {
    this.args.changeset.dataProxy.data.query = value;
  }

  get selectedPropertyQuery() {
    return this.queryableProperties.value?.reduce((props, prop) => {
      if (this.query?.[prop.id]) {
        props.push({
          ...prop,
          value: this.query[prop.id],
        });
      }
      return props;
    }, [] as any[]);
  }

  get queryablePropertiesOptions() {
    return this.queryableProperties.value?.filter(
      (property) => !this.query?.[property.id],
    );
  }

  get newQueryValueControlType() {
    return this.selectedNewQueryProperty?.type === 'integer'
      ? 'number'
      : 'text';
  }

  get isQueryBuildDisabled() {
    return !this.collectionId || !this.queryableProperties.isResolved;
  }

  get isAddNewQueryPropertyDisabled() {
    return !this.selectedNewQueryProperty || isBlank(this.newQueryValue);
  }

  @action onCollectionIdChanged() {
    this.resetNewQueryProperty();
  }

  @action
  addNewQuery() {
    if (this.args.changeset.dataProxy.data.query) {
      this.query[this.selectedNewQueryProperty!.id] = this.newQueryValue!;
    } else {
      this.query = {
        [this.selectedNewQueryProperty!.id]: this.newQueryValue!,
      };
    }

    this.resetNewQueryProperty();
  }

  @action
  deleteQueryProperty(propertyId: string) {
    if (this.query) {
      delete this.query[propertyId];
      this.args.changeset.dataProxy.data.query = {
        ...this.args.changeset.dataProxy.data.query,
      };
    }
  }

  resetNewQueryProperty() {
    this.selectedNewQueryProperty = null;
    this.newQueryValue = null;
  }
}
