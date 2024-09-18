declare module 'simulation/types' {
  export type TriggerType = 'Timeout' | 'Probability' | 'Condition'
  export type StockTypeType = 'Store' | 'Conveyor'
  export type PrimitiveConnectorType = 'Flow' | 'Link' | 'Transition'
  export type PrimitiveNodeType =
    | 'Stock'
    | 'Text'
    | 'Button'
    | 'Picture'
    | 'Converter'
    | 'Variable'
    | 'State'
    | 'Action'
    | 'Folder'
    | 'Display'
    | 'Agents'
    | 'Ghost'
  export type PrimitiveNameType = PrimitiveNodeType | PrimitiveConnectorType | 'Setting'
  export type FolderTypeType = 'None' | 'Agent'
  export type NetworkType = 'None' | 'Custom Function'
  export type PlacementType = 'Random' | 'Network' | 'Grid' | 'Ellipse' | 'Custom Function'
}
