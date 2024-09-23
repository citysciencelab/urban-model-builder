declare module 'simulation/ModelNode' {
  import { Model } from 'simulation'
  import { PrimitiveNameType } from 'simulation/types'
  export function loadXML(modelString: string): ModelNode
  export function modelNodeClone(node: any, parent: any): ModelNode
  export function primitives(
    root: ModelNode,
    type?: (PrimitiveNameType | PrimitiveNameType[]) | undefined
  ): any[]
  export class ModelNode {
    attributes: any
    parent: ModelNode
    children: ModelNode[]
    id: string
    value: {
      nodeName: string
    }
    _primitive: import('simulation/blocks').Primitive
    source: ModelNode
    target: ModelNode
    primitive(model: Model, config?: any): import('simulation/blocks').Primitive
    addChild(newChild: ModelNode): void
    getAttribute(x: string): string
    setAttribute(x: any, value: any): void
    getValue(): {
      removeAttribute: (name: any) => any
    }
    toString(indent?: number): any
  }
}
