import { NodeType } from 'hcu-urban-model-builder-backend';

export const NodeIconMap: Record<string, string> = {
  [NodeType.Stock]: 'inventory',
  [NodeType.Variable]: 'category',
  [NodeType.Flow]: 'flow-icon',
  [NodeType.Converter]: 'autorenew',
  [NodeType.State]: 'toggle_off',
  [NodeType.Transition]: 'transition_push',
  [NodeType.Action]: 'play_pause',
  [NodeType.Population]: 'groups',
  [NodeType.Agent]: 'person',
  [NodeType.Folder]: 'folder',
  [NodeType.Ghost]: 'ghost',
  [NodeType.OgcApiFeatures]: 'storage',
};
