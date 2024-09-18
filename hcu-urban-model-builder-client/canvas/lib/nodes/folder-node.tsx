import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";

export const FolderNode = memo(({ selected }: NodeProps) => {
  return (
    <>
      <NodeResizer color="#ff0071" isVisible={!!selected} />
      <div>Group {}</div>
    </>
  );
});
