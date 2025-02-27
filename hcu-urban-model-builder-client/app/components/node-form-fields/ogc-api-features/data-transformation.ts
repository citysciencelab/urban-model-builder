import { action } from '@ember/object';
import Component from '@glimmer/component';
import type { TrackedAsyncData } from 'ember-async-data';
import type Node from 'hcu-urban-model-builder-client/models/node';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';
import { GEOMETRY_KEY } from 'hcu-urban-model-builder-backend';

export interface NodeFormFieldsOgcApiFeaturesDataTransformationSignature {
  // The arguments accepted by the component
  Args: {
    changeset: TrackedChangeset<Node>;
    propertiesSchema: TrackedAsyncData<any[]>;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsOgcApiFeaturesDataTransformationComponent extends Component<NodeFormFieldsOgcApiFeaturesDataTransformationSignature> {
  get keyOptions() {
    if (!this.args.propertiesSchema.isResolved) {
      return null;
    }
    if (!this.args.propertiesSchema.value) {
      return null;
    }

    const all = this.args.propertiesSchema.value.filter(
      (property) => property.type === 'string' || property.type === 'integer',
    );

    return this.filterBySelectProperties(all);
  }

  get valueOptions() {
    if (!this.args.propertiesSchema.isResolved) {
      return null;
    }

    const options = this.filterBySelectProperties(
      this.args.propertiesSchema.value,
    );

    if (!this.args.changeset.dataProxy.data.query?.skipGeometry) {
      options.push({
        id: GEOMETRY_KEY,
        title: 'Geometry',
        type: 'geometry',
      });
    }

    return options;
  }

  get selectedKeyProperty() {
    if (!this.args.changeset.dataProxy.data?.dataTransform?.keyProperty) {
      return [];
    }

    return (
      this.args.propertiesSchema.value?.find(
        (property) =>
          property.id ===
          this.args.changeset.dataProxy.data.dataTransform?.keyProperty,
      ) || null
    );
  }

  get selectedValueProperties() {
    if (!this.args.changeset.dataProxy.data?.dataTransform?.valueProperties) {
      return [];
    }

    return this.valueOptions?.filter((property) =>
      this.args.changeset.dataProxy.data?.dataTransform?.valueProperties!.includes(
        property.id,
      ),
    );
  }

  @action onChangeKey(selectedProperty: { id: string } | null) {
    if (!this.args.changeset.dataProxy.data.dataTransform) {
      this.args.changeset.dataProxy.data.dataTransform = {};
    }
    this.args.changeset.dataProxy.data.dataTransform.keyProperty =
      selectedProperty?.id || undefined;
  }

  @action onChangeValue(selectedProperty: { id: string }[]) {
    if (!this.args.changeset.dataProxy.data.dataTransform) {
      this.args.changeset.dataProxy.data.dataTransform = {};
    }
    this.args.changeset.dataProxy.data.dataTransform.valueProperties =
      selectedProperty.map((property) => property.id);
  }

  private filterBySelectProperties(properties: any[]) {
    if (
      this.args.changeset.dataProxy.data.query?.properties &&
      this.args.changeset.dataProxy.data.query?.properties.length > 0
    ) {
      return properties.filter((property) =>
        this.args.changeset.dataProxy.data.query!.properties!.includes(
          property.id,
        ),
      );
    } else {
      return properties;
    }
  }
}
