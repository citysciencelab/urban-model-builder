import { TSchema, Type } from "@feathersjs/typebox";

export const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()])