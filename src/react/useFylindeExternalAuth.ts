import { useState, useEffect } from "react";
import { FylindeExternalAuth } from "../FylindeExternalAuth";
import { ExternalProvider } from "../types";

export type FylindeExternalAuthState =
  | { loading: true; authURL?: undefined; error?: undefined }
  | { loading: false; authURL: string; error?: undefined }
  | { loading: false; authURL?: undefined; error: unknown };

export const useFylindeExternalAuth = ({
  fylindeURL,
  provider,
  redirectURL,
}: {
  fylindeURL: string;
  provider: ExternalProvider;
  redirectURL: string;
}) => {
  const [state, setState] = useState<FylindeExternalAuthState>({
    authURL: undefined,
    error: undefined,
    loading: true,
  });

  useEffect(() => {
    const triggerExternalAuth = async () => {
      try {
        const auth = new FylindeExternalAuth(fylindeURL, provider);
        const result = await auth.initiate({ redirectURL });

        setState({ authURL: result, loading: false });
      } catch (error) {
        if (error instanceof Error) {
          setState({ loading: false, error: error.message });
        } else {
          setState({ loading: false, error: "Unknown error" });
        }
      }
    };

    void triggerExternalAuth();
  }, [fylindeURL]);

  return state;
};
