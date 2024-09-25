declare module '@ember-data/model/-private/has-many' {
  export function hasMany<T>(
    type: TypeFromInstance<NoNull<T>>,
    options: RelationshipOptions<T, boolean> & {
      sortField?: string;
      sortDirection?: number;
    },
  ): RelationshipDecorator<T>;
}
