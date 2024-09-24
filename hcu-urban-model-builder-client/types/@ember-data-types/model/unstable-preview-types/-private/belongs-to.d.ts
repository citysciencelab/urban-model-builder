declare module '@ember-data/model/-private/belongs-to' {
  export function belongsTo(
    type: string,
    options: RelationshipOptions<unknown, boolean> & { readOnly: boolean },
  ): RelationshipDecorator<unknown>;
}
