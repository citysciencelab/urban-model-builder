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
  readonly queryPropertyOperationOptions = [`=`, `!=`, `>`, `<`, `>=`, `<=`];
  @service declare ogcApiFeatures: OgcApiFeaturesService;

  @tracked selectedNewQueryProperty: { id: string; type: string } | null = null;
  @tracked newQueryValue: string | number | null = null;
  @tracked newQueryOperator: string = '=';

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

  get propertyFilters() {
    return this.args.changeset.dataProxy.data.query!.propertyFilters as Record<
      string,
      any
    >;
  }

  set propertyFilters(value) {
    this.args.changeset.dataProxy.data.query!.propertyFilters = value;
  }

  get selectedPropertyQuery() {
    return this.queryableProperties.value?.reduce((props, prop) => {
      if (this.propertyFilters?.[prop.id]) {
        props.push({
          ...prop,
          filter: this.propertyFilters[prop.id],
        });
      }
      return props;
    }, [] as any[]);
  }

  get queryablePropertiesOptions() {
    return this.queryableProperties.value?.filter(
      (property) => !this.propertyFilters?.[property.id],
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

  get currentQueryOperatorOptions() {
    if (
      this.selectedNewQueryProperty?.id === 'id' ||
      this.selectedNewQueryProperty?.type !== 'integer'
    ) {
      return ['='];
    } else {
      return this.queryPropertyOperationOptions;
    }
  }

  @action onCollectionIdChanged() {
    this.resetNewQueryProperty();
  }

  @action
  addNewQuery() {
    const newFilter = {
      operator: this.newQueryOperator,
      value: this.newQueryValue,
    };
    if (this.propertyFilters) {
      this.propertyFilters[this.selectedNewQueryProperty!.id] = newFilter;
    } else {
      this.propertyFilters = {
        [this.selectedNewQueryProperty!.id]: newFilter,
      };
    }

    this.resetNewQueryProperty();
  }

  @action
  deleteQueryProperty(propertyId: string) {
    if (this.propertyFilters) {
      delete this.propertyFilters[propertyId];
      this.args.changeset.dataProxy.data.query!.propertyFilters = {
        ...this.args.changeset.dataProxy.data.query?.propertyFilters,
      };
    }
  }

  resetNewQueryProperty() {
    this.selectedNewQueryProperty = null;
    this.newQueryValue = null;
    this.newQueryOperator = '=';
  }
}
