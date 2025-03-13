import type { PropsWithChildren } from "react";
import { Provider } from "./context";
import { FylindeAuthClient } from "../FylindeAuthClient";

export const FylindeAuthProvider = ({ children, client }: PropsWithChildren<{ client: FylindeAuthClient }>) => {
  return <Provider value={client}>{children}</Provider>;
};
