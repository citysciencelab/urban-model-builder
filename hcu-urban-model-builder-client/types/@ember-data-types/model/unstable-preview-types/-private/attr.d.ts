declare module '@ember-data/model/-private/attr' {
  export function attr(
    type: string,
    options?: AttrOptions & { readOnly: boolean },
  ): DataDecorator;
}
