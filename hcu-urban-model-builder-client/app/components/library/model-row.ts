import LibraryModelCardComponent from './model-card';

/**
 * A model as a row of the compact Library table: the same information as the
 * card, without the thumbnail.
 */
export default class LibraryModelRowComponent extends LibraryModelCardComponent {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Library::ModelRow': typeof LibraryModelRowComponent;
  }
}
