import { createContext, useContext } from "react";
import { FylindeAuthClient } from "../FylindeAuthClient";

export const createSafeContext = <TValue>() => {
  const context = createContext<TValue | undefined>(undefined);

  function useSafeContext() {
    const value = useContext(context);
    if (value === undefined) {
      throw new Error("useContext must be inside a Provider with a value");
    }
    return value;
  }

  return [useSafeContext, context.Provider] as const;
};

const [useFylindeAuthContext, Provider] = createSafeContext<FylindeAuthClient>();

export { useFylindeAuthContext, Provider };
