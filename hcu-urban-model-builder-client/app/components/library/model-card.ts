import Component from '@glimmer/component';
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type UserService from 'hcu-urban-model-builder-client/services/user';

export interface LibraryModelCardSignature {
  Args: {
    model: ModelModel;
    /** "Continue": the most recently edited model, two columns wide. */
    featured?: boolean;
    onEdit: (model: ModelModel) => void;
    onDelete: (model: ModelModel) => void;
  };
  Element: HTMLElement;
}

/**
 * A model as a sheet (UMB Design System: ModelCard): graph thumbnail, state,
 * title, node-mix bar and meta. The default item of the Library grid.
 */
export default class LibraryModelCardComponent extends Component<LibraryModelCardSignature> {
  @service declare intl: IntlService;
  @service declare user: UserService;

  /** The version the card opens: the latest draft, else the latest published. */
  get versionId(): string | null {
    const { model } = this.args;
    return (
      model.belongsTo('latestDraftVersion').id() ??
      model.belongsTo('latestPublishedVersion').id()
    );
  }

  /** The user's role for this model; empty for models of others. */
  get roleLabel() {
    const { model } = this.args;
    const creatorId = model.belongsTo('createdBy').id();

    if (creatorId && creatorId === this.user.currentUserId) {
      return this.intl.t('permissions.creator');
    }
    return model.role > 0 ? this.intl.t(`permissions.${model.role}`) : '';
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Library::ModelCard': typeof LibraryModelCardComponent;
  }
}
