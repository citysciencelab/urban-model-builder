import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { EmberReactConnectorContext } from "./ember-react-connector";

export const NodeParamsMapContext = createContext<Map<string, any>>(null);

export const NodeParamsMapProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const emberReactConnector = useContext(EmberReactConnectorContext);
  const [map, setMap] = useState(new Map<string, any>());

  const reloadMap = () => {
    const scenarioValues = emberReactConnector.peekAll("scenarios-value");

    const map = new Map<string, any>();

    for (const value of scenarioValues) {
      map.set(value.get("nodes.id"), value.value);
    }

    setMap(map);
  };

  useEffect(() => {
    reloadMap();
  }, [emberReactConnector]);

  const scenarioValueCreated = (value: any) => {
    map.set(value.get("nodes.id"), value.value);
    setMap(new Map(map));
  };

  const scenarioValueDeleted = (value: any) => {
    map.delete(value.get("nodes.id"));
    setMap(new Map(map));
  };

  useEffect(() => {
    emberReactConnector.eventBus.on("scenario-value-changed", reloadMap);
    emberReactConnector.storeEventEmitter.on(
      "scenarios-value",
      "created",
      scenarioValueCreated,
    );
    emberReactConnector.storeEventEmitter.on(
      "scenarios-value",
      "deleted",
      scenarioValueDeleted,
    );

    return () => {
      emberReactConnector.eventBus.off("scenario-value-changed", reloadMap);
      emberReactConnector.storeEventEmitter.off(
        "scenarios-value",
        "created",
        scenarioValueCreated,
      );
      emberReactConnector.storeEventEmitter.off(
        "scenarios-value",
        "deleted",
        scenarioValueDeleted,
      );
    };
  });

  return (
    <NodeParamsMapContext.Provider value={map}>
      {children}
    </NodeParamsMapContext.Provider>
  );
};
