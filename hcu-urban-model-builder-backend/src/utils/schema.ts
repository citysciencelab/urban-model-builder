import { TSchema, Type } from '@feathersjs/typebox'

export const Nullable = <T extends TSchema>(schema: T) => Type.Optional(Type.Union([Type.Null(), schema]))

export const Literals = <T extends string>(...values: T[]) => {
  return Type.Union(values.map((l) => Type.Literal(l)))
}
