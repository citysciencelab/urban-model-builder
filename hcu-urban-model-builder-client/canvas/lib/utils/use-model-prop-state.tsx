import { useCallback, useEffect, useState } from "react";
interface UseModelValueStateProps {
  emberModel: {
    onSave: (callback: (newNodeModel: any) => void) => void;
    offSave: (listener: (newNode: any) => void) => void;
  };
  propertyName: string;
}

export function useModelPropState(props: UseModelValueStateProps) {
  const [name, setName] = useState(
    (props.emberModel as any)[props.propertyName] as string,
  );

  const onSave = useCallback(
    (newNodeModel: any) => {
      setName(newNodeModel[props.propertyName]);
    },
    [setName],
  );

  useEffect(() => {
    props.emberModel.onSave(onSave);

    return () => {
      props.emberModel.offSave(onSave);
    };
  }, [props.emberModel, onSave]);

  return name;
}
