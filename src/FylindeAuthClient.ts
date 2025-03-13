import { FylindeRefreshTokenStorageHandler } from "./FylindeRefreshTokenStorageHandler";
import { getRequestData, getTokenIss, isExpiredToken } from "./utils";
import type {
  FetchRequestInfo,
  FetchWithAdditionalParams,
  PasswordResetResponse,
  PasswordResetVariables,
  StorageRepository,
  TokenCreateResponse,
  TokenCreateVariables,
  TokenRefreshResponse,
} from "./types";
import { invariant } from "./utils";
import { PASSWORD_RESET, TOKEN_CREATE, TOKEN_REFRESH } from "./mutations";
import cookie from "cookie";
import { FylindeAccessTokenStorageHandler } from "./FylindeAccessTokenStorageHandler";

export interface FylindeAuthClientProps {
  onAuthRefresh?: (isAuthenticating: boolean) => void;
  fylindeApiUrl: string;
  refreshTokenStorage?: StorageRepository;
  accessTokenStorage?: StorageRepository;
  tokenGracePeriod?: number;
  defaultRequestInit?: RequestInit;
}

export class FylindeAuthClient {
  // we'll assume a generous time of 2 seconds for api to
  // process our request
  private tokenGracePeriod = 2000;

  private tokenRefreshPromise: null | Promise<Response> = null;
  private onAuthRefresh?: (isAuthenticating: boolean) => void;
  private fylindeApiUrl: string;
  /**
   * Persistent storage (for refresh token)
   */
  private refreshTokenStorage: FylindeRefreshTokenStorageHandler | null;

  /**
   * Non-persistent storage for access token
   */
  private acessTokenStorage: FylindeAccessTokenStorageHandler;

  private defaultRequestInit: RequestInit | undefined;
  /**
   * Use ths method to clear event listeners from storageHandler
   *  @example
   *  ```jsx
   *  useEffect(() => {
   *    return () => {
   *      FylindeAuthClient.cleanup();
   *    }
   *  }, [])
   *  ```
   */

  constructor({
    fylindeApiUrl,
    refreshTokenStorage,
    accessTokenStorage,
    onAuthRefresh,
    tokenGracePeriod,
    defaultRequestInit,
  }: FylindeAuthClientProps) {
    this.defaultRequestInit = defaultRequestInit;
    if (tokenGracePeriod) {
      this.tokenGracePeriod = tokenGracePeriod;
    }
    this.onAuthRefresh = onAuthRefresh;
    this.fylindeApiUrl = fylindeApiUrl;

    const refreshTokenRepo =
      refreshTokenStorage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    this.refreshTokenStorage = refreshTokenRepo
      ? new FylindeRefreshTokenStorageHandler(refreshTokenRepo, fylindeApiUrl)
      : null;

    const accessTokenRepo = accessTokenStorage ?? getInMemoryAccessTokenStorage();
    this.acessTokenStorage = new FylindeAccessTokenStorageHandler(accessTokenRepo, fylindeApiUrl);
  }

  cleanup = () => {
    this.refreshTokenStorage?.cleanup();
  };

  private runAuthorizedRequest: FetchWithAdditionalParams = (input, init, additionalParams) => {
    // technically we run this only when token is there
    // but just to make typescript happy
    const token = this.acessTokenStorage.getAccessToken();
    if (!token) {
      return fetch(input, init);
    }

    const headers = init?.headers || {};

    const getURL = (input: FetchRequestInfo) => {
      if (typeof input === "string") {
        return input;
      } else if ("url" in input) {
        return input.url;
      } else {
        return input.href;
      }
    };

    const iss = getTokenIss(token);
    const issuerAndDomainMatch = getURL(input) === iss;
    const shouldAddAuthorizationHeader =
      issuerAndDomainMatch || additionalParams?.allowPassingTokenToThirdPartyDomains;

    if (!issuerAndDomainMatch) {
      if (shouldAddAuthorizationHeader) {
        console.warn(
          "Token's `iss` and request URL do not match but `allowPassingTokenToThirdPartyDomains` was specified.",
        );
      } else {
        console.warn(
          "Token's `iss` and request URL do not match. Not adding `Authorization` header to the request.",
        );
      }
    }

    return fetch(input, {
      ...init,
      headers: shouldAddAuthorizationHeader ? { ...headers, Authorization: `Bearer ${token}` } : headers,
    });
  };

  private handleRequestWithTokenRefresh: FetchWithAdditionalParams = async (
    input,
    requestInit,
    additionalParams,
  ) => {
    const refreshToken = this.refreshTokenStorage?.getRefreshToken();

    invariant(refreshToken, "Missing refresh token in token refresh handler");

    const accessToken = this.acessTokenStorage.getAccessToken();

    // the refresh already finished, proceed as normal
    if (accessToken && !isExpiredToken(accessToken, this.tokenGracePeriod)) {
      return this.fetchWithAuth(input, requestInit, additionalParams);
    }

    this.onAuthRefresh?.(true);

    // if the promise is already there, use it
    if (this.tokenRefreshPromise) {
      const response = await this.tokenRefreshPromise;

      const res = (await response.clone().json()) as TokenRefreshResponse;

      const {
        errors: graphqlErrors,
        data: {
          tokenRefresh: { errors, token },
        },
      } = res;

      this.onAuthRefresh?.(false);

      if (errors?.length || graphqlErrors?.length || !token) {
        this.tokenRefreshPromise = null;
        this.refreshTokenStorage?.clearAuthStorage();
        return fetch(input, requestInit);
      }

      this.refreshTokenStorage?.setAuthState("signedIn");
      this.acessTokenStorage.setAccessToken(token);
      this.tokenRefreshPromise = null;
      return this.runAuthorizedRequest(input, requestInit, additionalParams);
    }

    // this is the first failed request, initialize refresh
    this.tokenRefreshPromise = fetch(
      this.fylindeApiUrl,
      getRequestData(TOKEN_REFRESH, { refreshToken }, { ...this.defaultRequestInit, ...requestInit }),
    );
    return this.fetchWithAuth(input, requestInit, additionalParams);
  };

  private handleSignIn = async <TOperation extends TokenCreateResponse | PasswordResetResponse>(
    response: Response,
  ): Promise<TOperation> => {
    const readResponse = (await response.json()) as TOperation;

    const responseData =
      "tokenCreate" in readResponse.data ? readResponse.data.tokenCreate : readResponse.data.setPassword;

    if (!responseData) {
      return readResponse;
    }

    const { errors, token, refreshToken } = responseData;

    if (!token || errors.length) {
      this.refreshTokenStorage?.setAuthState("signedOut");
      return readResponse;
    }

    if (token) {
      this.acessTokenStorage.setAccessToken(token);
    }

    if (refreshToken) {
      this.refreshTokenStorage?.setRefreshToken(refreshToken);
    }

    this.refreshTokenStorage?.setAuthState("signedIn");
    return readResponse;
  };

  /**
   * @param additionalParams
   * @param additionalParams.allowPassingTokenToThirdPartyDomains if set to true, the `Authorization` header will be added to the request even if the token's `iss` and request URL do not match
   */
  fetchWithAuth: FetchWithAdditionalParams = async (input, init, additionalParams) => {
    const refreshToken = this.refreshTokenStorage?.getRefreshToken();

    if (!this.acessTokenStorage.getAccessToken() && typeof document !== "undefined") {
      // this flow is used by FylindeExternalAuth
      const tokenFromCookie = cookie.parse(document.cookie).token ?? null;
      if (tokenFromCookie) {
        this.acessTokenStorage.setAccessToken(tokenFromCookie);
      }
      document.cookie = cookie.serialize("token", "", { expires: new Date(0), path: "/" });
    }

    const accessToken = this.acessTokenStorage.getAccessToken();

    // access token is fine, add it to the request and proceed
    if (accessToken && !isExpiredToken(accessToken, this.tokenGracePeriod)) {
      return this.runAuthorizedRequest(input, init, additionalParams);
    }

    // refresh token exists, try to authenticate if possible
    if (refreshToken) {
      return this.handleRequestWithTokenRefresh(input, init, additionalParams);
    }

    // any regular mutation, no previous sign in, proceed
    return fetch(input, init);
  };

  resetPassword = async (variables: PasswordResetVariables, requestInit?: RequestInit) => {
    const response = await fetch(
      this.fylindeApiUrl,
      getRequestData(PASSWORD_RESET, variables, { ...this.defaultRequestInit, ...requestInit }),
    );

    return this.handleSignIn<PasswordResetResponse>(response);
  };

  signIn = async (variables: TokenCreateVariables, requestInit?: RequestInit) => {
    const response = await fetch(
      this.fylindeApiUrl,
      getRequestData(TOKEN_CREATE, variables, { ...this.defaultRequestInit, ...requestInit }),
    );

    return this.handleSignIn<TokenCreateResponse>(response);
  };

  signOut = () => {
    this.acessTokenStorage.clearAuthStorage();
    this.refreshTokenStorage?.clearAuthStorage();
    if (typeof document !== "undefined") {
      // this flow is used by FylindeExternalAuth
      document.cookie = cookie.serialize("token", "", {
        expires: new Date(0),
        path: "/",
      });
    }
  };
}

export const createFylindeAuthClient = (props: FylindeAuthClientProps) => new FylindeAuthClient(props);

function getInMemoryAccessTokenStorage(): StorageRepository {
  let accessToken: string | null = null;
  return {
    getItem() {
      return accessToken;
    },
    removeItem() {
      return (accessToken = null);
    },
    setItem(_key, value) {
      return (accessToken = value);
    },
  };
}
