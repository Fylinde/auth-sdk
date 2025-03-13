import { FylindeExternalAuth } from "../src/FylindeExternalAuth";
import { it, describe, expect } from "vitest";
import { ExternalProvider } from "../src";

describe("FylindeExternalAuth", () => {
  it("initiates external authentication successfully", async ({ }) => {
    const mockData = {
      externalAuthenticationUrl: {
        authenticationData: JSON.stringify({
          authorizationUrl: "http://localhost:8000/auth",
        }),
        errors: [],
      },
    };

    fetchMock.mockResponseOnce(JSON.stringify({ data: mockData }));

    // const auth = new FylindeExternalAuth("https://saleor.cloud.instance", ExternalProvider.OpenIDConnect);
    // const url = await auth.initiate({ redirectURL: "https://saleor.callback" });


    const auth = new FylindeExternalAuth("http://localhost:8000", ExternalProvider.OpenIDConnect);
    const url = await auth.initiate({ redirectURL: "http://localhost:3000/callback" });



    // expect(url).toBe("https://saleor.auth");
    expect(url).toContain("http://localhost:8000/auth");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("obtains access token successfully", async ({ }) => {
    const mockData = {
      externalObtainAccessTokens: {
        token: "abcdef",
        refreshToken: "abcdef",
        csrfToken: "abcdef",
        user: {},
      },
    };

    fetchMock.mockResponseOnce(JSON.stringify({ data: mockData }));

    const auth = new FylindeExternalAuth("http://localhost:8000", ExternalProvider.OpenIDConnect);
    const data = await auth.obtainAccessToken({ code: "1234", state: "state" });

    expect(data).toEqual(mockData.externalObtainAccessTokens);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
