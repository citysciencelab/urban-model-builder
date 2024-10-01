import { classify } from '@ember/string';
import { EdgeType, NodeType } from 'hcu-urban-model-builder-backend';

type EnumToLowerCaseStringMap<T extends Record<number | string, any>> = {
  [K in keyof T & string]: Lowercase<K>;
};

const enumToLowerCaseStringMap = <
  EnumType extends Record<number | string, any>,
  T extends EnumToLowerCaseStringMap<EnumType>,
>(
  inputEnum: EnumType,
) => {
  return Object.keys(inputEnum).reduce((acc: any, key: any) => {
    acc[key] = key.toLowerCase();
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
