import { useCallback, useContext, useRef } from "react";
import {
  BaseEdge,
  BuiltInNode,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type XYPosition,
} from "@xyflow/react";
import {
  ControlPoint,
  type ControlPointData,
} from "./editable/control-point.tsx";
import { getPath, getControlPoints } from "./editable/path";
import { EmberReactConnectorContext } from "../context/ember-react-connector.ts";

const useIdsForInactiveControlPoints = (points: ControlPointData[]) => {
  const ids = useRef<string[]>([]);

  if (ids.current.length === points.length) {
    return points.map((point, i) =>
      point.id ? point : { ...point, id: ids.current[i] },
    );
  } else {
    ids.current = [];

    return points.map((point, i) => {
      if (!point.id) {
        const id = window.crypto.randomUUID();
        ids.current[i] = id;
        return { ...point, id: id };
      } else {
        ids.current[i] = point.id;
        return point;
      }
    });
  }
};

export type TEditableEdge = Edge<{
  points: ControlPointData[];
}>;

const isEditableEdge = (edge: Edge): edge is TEditableEdge => true;

export function EditableEdge({
  id,
  selected,
  source,
  sourceX,
  sourceY,
  sourcePosition,
  target,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  markerStart,
  style,
  data = { points: [] },

  ...delegated
}: EdgeProps<TEditableEdge>) {
  const sourceOrigin = { x: sourceX, y: sourceY } as XYPosition;
  const targetOrigin = { x: targetX, y: targetY } as XYPosition;

  const { setEdges } = useReactFlow<BuiltInNode, TEditableEdge>();
  const emberReactConnectorContext = useContext(EmberReactConnectorContext);
  const shouldShowPoints = useStore((store) => {
    const sourceNode = store.nodeLookup.get(source)!;
    const targetNode = store.nodeLookup.get(target)!;

    return selected || sourceNode.selected || targetNode.selected;
  });

  const setControlPoints = useCallback(
    (update: (points: ControlPointData[]) => ControlPointData[]) => {
      setEdges((edges) =>
        edges.map((e) => {
          if (e.id !== id) return e;
          if (!isEditableEdge(e)) return e;

          const points = update(e.data?.points ?? []);

          const data = { ...e.data, points: points };

          emberReactConnectorContext.save("edge", e.id, {
            points: {
              data: points.map(({ id, x, y }) => ({ id, x, y })),
            },
          });

          return { ...e, data };
        }),
      );
    },
    [id, setEdges],
  );

  const pathPoints = [sourceOrigin, ...data.points, targetOrigin];
  const controlPoints = getControlPoints(pathPoints, {
    fromSide: sourcePosition,
    toSide: targetPosition,
  });
  const path = getPath(pathPoints, {
    fromSide: sourcePosition,
    toSide: targetPosition,
  });

  const controlPointsWithIds = useIdsForInactiveControlPoints(controlPoints);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        {...delegated}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
        }}
      />

      {shouldShowPoints &&
        controlPointsWithIds.map((point, index) => (
          <ControlPoint
            key={point.id}
            index={index}
            setControlPoints={setControlPoints}
            {...point}
          />
        ))}
    </>
  );
}
