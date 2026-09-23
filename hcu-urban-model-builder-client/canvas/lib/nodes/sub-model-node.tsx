import { Handle, NodeProps, Position, useStore } from '@xyflow/react';
import { memo } from 'react';
import { BaseNodeData } from './base-node/data.tsx';
import { DefaultNodeToolbar } from '../utils/default-node-toolbar.tsx';

type Port = { id: string; name: string };

export const SubModelNode = memo(({ id, data, isConnectable, selected, type }: NodeProps<any>) => {
  const edges = useStore((state) => state.edges);
  const modelData = data.emberModel?.get('data') || {};
  const inputs: Port[] = modelData.inputs || [];
  const outputs: Port[] = modelData.outputs || [];
  const portStyle = (index: number, count: number) => ({ left: `${((index + 1) / (count + 1)) * 100}%` });

  return <div className="react-flow__node-base__content react-flow__node-sub-model">
    {inputs.map((port, index) => {
      const isConnected = edges.some((edge) => edge.target === id && edge.targetHandle === `submodel-input-${port.id}`);
      return <Handle key={port.id} id={`submodel-input-${port.id}`} type="target" position={Position.Top} style={{ ...portStyle(index, inputs.length), background: isConnected ? '#198754' : '#e9a820' }} isConnectable={isConnectable} title={`${isConnected ? 'Verbunden' : 'Standardwert'}: ${port.name}`} />;
    })}
    {outputs.map((port, index) => <Handle key={port.id} id={`submodel-output-${port.id}`} type="source" position={Position.Bottom} style={portStyle(index, outputs.length)} isConnectable={isConnectable} title={`Ausgabe: ${port.name}`} />)}
    <BaseNodeData id={id} type={type} data={data} />
    <DefaultNodeToolbar nodeId={id} isNodeSelected={selected} allowGhost={true} />
  </div>;
});
