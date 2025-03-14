import type { StorageRepository } from "./types";

/* auth state when user signs in / out */
export const getStorageAuthEventKey = (prefix?: string) =>
  [prefix, "fylinde_storage_auth_change"].filter(Boolean).join("+");
export const getStorageAuthStateKey = (prefix?: string) =>
  [prefix, "fylinde_auth_module_auth_state"].filter(Boolean).join("+");
export const getRefreshTokenKey = (prefix?: string) =>
  [prefix, "fylinde_auth_module_refresh_token"].filter(Boolean).join("+");

export type AuthState = "signedIn" | "signedOut";

export type FylindeAuthEvent = CustomEvent<{ authState: AuthState }>;

export class FylindeRefreshTokenStorageHandler {
  constructor(
    private storage: StorageRepository,
    private prefix?: string,
  ) {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageChange);
    }
  }

  private handleStorageChange = (event: StorageEvent) => {
    const { oldValue, newValue, type, key } = event;

    if (oldValue === newValue || type !== "storage" || key !== getStorageAuthStateKey(this.prefix)) {
      return;
    }

    this.sendAuthStateEvent(newValue as AuthState);
  };

  cleanup = () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageChange);
    }
  };

  /* auth state */
  sendAuthStateEvent = (authState: AuthState) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent(getStorageAuthEventKey(this.prefix), {
        detail: { authState },
      });
      window.dispatchEvent(event);
    }
  };

  getAuthState = (): AuthState =>
    (this.storage.getItem(getStorageAuthStateKey(this.prefix)) as AuthState | undefined) || "signedOut";

  setAuthState = (authState: AuthState) => {
    this.storage.setItem(getStorageAuthStateKey(this.prefix), authState);
    this.sendAuthStateEvent(authState);
  };

  /* refresh token */
  getRefreshToken = () => this.storage.getItem(getRefreshTokenKey(this.prefix)) || null;

  setRefreshToken = (token: string) => {
    this.storage.setItem(getRefreshTokenKey(this.prefix), token);
  };

  /* performed on logout */
  clearAuthStorage = () => {
    this.setAuthState("signedOut");
    this.storage.removeItem(getRefreshTokenKey(this.prefix));
  };
}
