import { classify, dasherize } from '@ember/string';
import { EdgeType, NodeType } from 'hcu-urban-model-builder-backend';

// Utility type to convert a string from camelCase/PascalCase to kebab-case
type Dasherize<T extends string> = T extends `${infer First}${infer Rest}` // Split string into first character and rest
  ? `${Lowercase<First>}${DasherizeHelper<Rest>}` // Lowercase first character and process the rest
  : T; // Base case: If T is an empty string, just return it

// Helper type to process the rest of the string
type DasherizeHelper<T extends string> = T extends `${infer First}${infer Rest}` // Recursively process the string
  ? First extends Uppercase<First> // Check if the character is uppercase
    ? `-${Lowercase<First>}${DasherizeHelper<Rest>}` // Insert dash before the uppercase letter and lowercase it
    : `${First}${DasherizeHelper<Rest>}` // Keep lowercase letters unchanged
  : T; // Base case: If T is an empty string, just return it

type EnumToLowerCaseStringMap<T extends Record<number | string, any>> = {
  [K in keyof T & string]: Dasherize<K>;
};

const enumToLowerCaseStringMap = <
  EnumType extends Record<number | string, any>,
  T extends EnumToLowerCaseStringMap<EnumType>,
>(
  inputEnum: EnumType,
) => {
  return Object.keys(inputEnum).reduce((acc: any, key: any) => {
    acc[key] = dasherize(key);
    return acc;
  }, {}) as T;
};

export const ReactFlowNodeType = enumToLowerCaseStringMap(NodeType);
export const ReactFlowEdgeType = enumToLowerCaseStringMap(EdgeType);

function enumLowerCaseStringToEnumValue<
  EnumType extends Record<number | string, any>,
  EnumTypeMap extends EnumToLowerCaseStringMap<EnumType>,
  T extends EnumTypeMap[keyof EnumTypeMap] & string,
>(enumType: EnumType) {
  return (type: T) => {
    return enumType[classify(type) as keyof typeof enumType];
  };
}

export const reactFlowNodeToNodeType = enumLowerCaseStringToEnumValue(NodeType);

export const reactFlowEdgeToEdgeType = enumLowerCaseStringToEnumValue(EdgeType);
