import { useEffect } from "react";
import { type FylindeAuthEvent, getStorageAuthEventKey } from "../FylindeRefreshTokenStorageHandler";

interface UseAuthChangeProps {
  fylindeApiUrl: string;
  onSignedIn?: () => void;
  onSignedOut?: () => void;
}

// used to handle client cache invalidation on login / logout and when
// token refreshin fails
export const useAuthChange = ({ fylindeApiUrl, onSignedOut, onSignedIn }: UseAuthChangeProps) => {
  const handleAuthChange = (event: FylindeAuthEvent) => {
    const isCustomAuthEvent = event?.type === getStorageAuthEventKey(fylindeApiUrl);

    if (!isCustomAuthEvent) {
      return;
    }

    const { authState } = event.detail;

    if (authState === "signedIn") {
      onSignedIn?.();
    } else if (authState === "signedOut") {
      onSignedOut?.();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // for current window
    window.addEventListener(getStorageAuthEventKey(fylindeApiUrl), handleAuthChange as EventListener);

    return () => {
      window.removeEventListener(getStorageAuthEventKey(fylindeApiUrl), handleAuthChange as EventListener);
    };
  }, []);
};
