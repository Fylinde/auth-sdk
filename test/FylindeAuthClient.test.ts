import { it, describe, vi, expect } from "vitest";
import { FylindeAuthClient } from "../src/FylindeAuthClient";
import { getRefreshTokenKey } from "../src/FylindeRefreshTokenStorageHandler";
import type { StorageRepository } from "../src";

describe("FylindeAuthClient", () => {
  const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  } satisfies StorageRepository;
  // const masterStagingUrl = "https://master.staging.saleor.cloud/graphql/";
  // const otherApiUrl = "https://some-other-domain-auth-sdk.saleor.cloud/graphql/";
  const masterStagingUrl = "http://localhost:8000/graphql/";
  const otherApiUrl = "http://localhost:8000/auth/graphql/";


  it(`should fetch without authentication token`, async () => {
    const onAuthRefresh = vi.fn();
    const fylindeAuthClient = new FylindeAuthClient({
      fylindeApiUrl: masterStagingUrl,
      refreshTokenStorage: mockStorage,
      onAuthRefresh,
    });

    await fylindeAuthClient.fetchWithAuth(masterStagingUrl, {
      method: "POST",
      body: "{}",
    });

    expect(fetchMock).toHaveBeenCalledWith(masterStagingUrl, {
      method: "POST",
      body: "{}",
    });
  });

  it(`should fetch with refresh token`, async () => {
    const onAuthRefresh = vi.fn();
    const fylindeAuthClient = new FylindeAuthClient({
      fylindeApiUrl: masterStagingUrl,
      refreshTokenStorage: mockStorage,
      onAuthRefresh,
    });

    const refreshToken = "aaaaaa";
    mockStorage.getItem.mockImplementation((key) => {
      if (key === getRefreshTokenKey(masterStagingUrl)) {
        return refreshToken;
      }
      return null;
    });

    fetchMock.mockResponse(async (req) => {
      if (req?.body?.toString().includes("tokenRefresh")) {
        return JSON.stringify({
          data: {
            tokenRefresh: {
              token:
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE2ODQ4MzU3MDgsIm93bmVyIjoic2FsZW9yIiwiaXNzIjoiaHR0cHM6Ly9tYXN0ZXIuc3RhZ2luZy5zYWxlb3IuY2xvdWQvZ3JhcGhxbC8iLCJleHAiOjE2ODQ4MzYwMDgsInRva2VuIjoiYXkxeEg0T3I1UXJNIiwiZW1haWwiOiJ0ZXN0ZXJzMitkYXNoYm9hcmRAc2FsZW9yLmlvIiwidHlwZSI6ImFjY2VzcyIsInVzZXJfaWQiOiJWWE5sY2pveE1qa3ciLCJpc19zdGFmZiI6dHJ1ZX0.BzclMD_PUOY6_hfOCXrx8veojK9EpWNSjn0vrW_XQYLO4UdojQA4NwEk3dfH7N2q8RvaK-iE-6lEC6nFNLkbzW-C1os6ijt0ptzm3FV-YNE_0JQvFEpSchnp-ME3j2VmEWqL_kqxgt9E9zr71o-czTVBu6DVNIkkG9lEXzpZZ3_DM_Q1gd-qatUF87WxU4zNLFMefQ2khOdY7ssPaMoX3foaoPFh8h2VrGFLfadfZ9uIpdoEB71ZyMrt2F7kbcGGospjRQcITjA0szwk6zH-rBhM81I8dLilNMKB75-PqIvP3a7r4WAw8tJ_yRy76umerCOHbbsF3B2XGhm5HFYkTw",
            },
          },
        });
      }
      return JSON.stringify({});
    });

    await fylindeAuthClient.fetchWithAuth(masterStagingUrl, {
      method: "POST",
      body: "{}",
    });

    expect(onAuthRefresh).toHaveBeenCalledWith(true);

    expect((fetchMock.mock.lastCall?.[1]?.headers as Record<string, string>).Authorization).toBeTruthy();
  });

  it(`should not add auth token to external URLs`, async () => {
    const onAuthRefresh = vi.fn();
    const fylindeAuthClient = new FylindeAuthClient({
      fylindeApiUrl: masterStagingUrl,
      refreshTokenStorage: mockStorage,
      onAuthRefresh,
    });

    const refreshToken = "aaaaaa";
    mockStorage.getItem.mockImplementation((key) => {
      if (key === getRefreshTokenKey(masterStagingUrl)) {
        return refreshToken;
      }
      return null;
    });

    fetchMock.mockResponse(async (req) => {
      if (req?.body?.toString().includes("tokenRefresh")) {
        return JSON.stringify({
          data: {
            tokenRefresh: {
              token:
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE2ODQ4MzU3MDgsIm93bmVyIjoic2FsZW9yIiwiaXNzIjoiaHR0cHM6Ly9tYXN0ZXIuc3RhZ2luZy5zYWxlb3IuY2xvdWQvZ3JhcGhxbC8iLCJleHAiOjE2ODQ4MzYwMDgsInRva2VuIjoiYXkxeEg0T3I1UXJNIiwiZW1haWwiOiJ0ZXN0ZXJzMitkYXNoYm9hcmRAc2FsZW9yLmlvIiwidHlwZSI6ImFjY2VzcyIsInVzZXJfaWQiOiJWWE5sY2pveE1qa3ciLCJpc19zdGFmZiI6dHJ1ZX0.BzclMD_PUOY6_hfOCXrx8veojK9EpWNSjn0vrW_XQYLO4UdojQA4NwEk3dfH7N2q8RvaK-iE-6lEC6nFNLkbzW-C1os6ijt0ptzm3FV-YNE_0JQvFEpSchnp-ME3j2VmEWqL_kqxgt9E9zr71o-czTVBu6DVNIkkG9lEXzpZZ3_DM_Q1gd-qatUF87WxU4zNLFMefQ2khOdY7ssPaMoX3foaoPFh8h2VrGFLfadfZ9uIpdoEB71ZyMrt2F7kbcGGospjRQcITjA0szwk6zH-rBhM81I8dLilNMKB75-PqIvP3a7r4WAw8tJ_yRy76umerCOHbbsF3B2XGhm5HFYkTw",
            },
          },
        });
      }
      return JSON.stringify({});
    });

    await fylindeAuthClient.fetchWithAuth(otherApiUrl, {
      method: "POST",
      body: "{}",
    });

    expect(onAuthRefresh).toHaveBeenCalledWith(true);

    expect((fetchMock.mock.lastCall?.[1]?.headers as Record<string, string>).Authorization).toBeFalsy();
  });

  it(`should not read other domain's tokens`, async () => {
    const onAuthRefresh = vi.fn();
    const fylindeAuthClient = new FylindeAuthClient({
      fylindeApiUrl: otherApiUrl,
      refreshTokenStorage: mockStorage,
      onAuthRefresh,
    });

    await fylindeAuthClient.fetchWithAuth(otherApiUrl, {
      method: "POST",
      body: "{}",
    });

    expect(mockStorage.getItem).toHaveBeenCalledWith(getRefreshTokenKey(otherApiUrl));
    expect(mockStorage.getItem).not.toHaveBeenCalledWith(getRefreshTokenKey(masterStagingUrl));
  });

  it(`should add auth token to external URLs when allowPassingTokenToThirdPartyDomains=true`, async () => {
    const onAuthRefresh = vi.fn();
    const fylindeAuthClient = new FylindeAuthClient({
      fylindeApiUrl: masterStagingUrl,
      refreshTokenStorage: mockStorage,
      onAuthRefresh,
    });

    const refreshToken = "aaaaaa";
    mockStorage.getItem.mockImplementation((key) => {
      if (key === getRefreshTokenKey(masterStagingUrl)) {
        return refreshToken;
      }
      return null;
    });

    fetchMock.mockResponse(async (req) => {
      if (req?.body?.toString().includes("tokenRefresh")) {
        return JSON.stringify({
          data: {
            tokenRefresh: {
              token:
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE2ODQ4MzU3MDgsIm93bmVyIjoic2FsZW9yIiwiaXNzIjoiaHR0cHM6Ly9tYXN0ZXIuc3RhZ2luZy5zYWxlb3IuY2xvdWQvZ3JhcGhxbC8iLCJleHAiOjE2ODQ4MzYwMDgsInRva2VuIjoiYXkxeEg0T3I1UXJNIiwiZW1haWwiOiJ0ZXN0ZXJzMitkYXNoYm9hcmRAc2FsZW9yLmlvIiwidHlwZSI6ImFjY2VzcyIsInVzZXJfaWQiOiJWWE5sY2pveE1qa3ciLCJpc19zdGFmZiI6dHJ1ZX0.BzclMD_PUOY6_hfOCXrx8veojK9EpWNSjn0vrW_XQYLO4UdojQA4NwEk3dfH7N2q8RvaK-iE-6lEC6nFNLkbzW-C1os6ijt0ptzm3FV-YNE_0JQvFEpSchnp-ME3j2VmEWqL_kqxgt9E9zr71o-czTVBu6DVNIkkG9lEXzpZZ3_DM_Q1gd-qatUF87WxU4zNLFMefQ2khOdY7ssPaMoX3foaoPFh8h2VrGFLfadfZ9uIpdoEB71ZyMrt2F7kbcGGospjRQcITjA0szwk6zH-rBhM81I8dLilNMKB75-PqIvP3a7r4WAw8tJ_yRy76umerCOHbbsF3B2XGhm5HFYkTw",
            },
          },
        });
      }
      return JSON.stringify({});
    });

    await fylindeAuthClient.fetchWithAuth(
      otherApiUrl,
      {
        method: "POST",
        body: "{}",
      },
      { allowPassingTokenToThirdPartyDomains: true },
    );

    expect(onAuthRefresh).toHaveBeenCalledWith(true);

    expect((fetchMock.mock.lastCall?.[1]?.headers as Record<string, string>).Authorization).toBeTruthy();
  });
});
