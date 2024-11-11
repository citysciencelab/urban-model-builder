import { useCallback, useEffect, useState } from "react";
interface UseModelValueStateProps {
  emberModel: {
    onSave: (callback: (newNodeModel: any) => void) => void;
    offSave: (listener: (newNode: any) => void) => void;
    get(propertyName: string): any;
  };
  propertyName: string;
}

export function useModelPropState(props: UseModelValueStateProps) {
  const [name, setName] = useState(
    props.emberModel?.get(props.propertyName) as string,
  );

  const onSave = useCallback(
    (newNodeModel: any) => {
      setName(newNodeModel.get(props.propertyName));
    },
    [setName],
  );

  useEffect(() => {
    if (!props.emberModel) {
      return;
    }
    setName((props.emberModel as any)?.get(props.propertyName) as string);
    props.emberModel.onSave(onSave);

    return () => {
      props.emberModel.offSave(onSave);
    };
  }, [props.emberModel, onSave]);

  return name;
}
