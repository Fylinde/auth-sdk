import type { StorageRepository } from "../types";
import cookie from "cookie"; // ✅ Use `cookie` package for parsing
import type { Request, Response } from "express"; // ✅ Use Express for server-side handling

export const getServerCookiesStorage = (
  req: Request,
  res: Response,
  options: { secure?: boolean } = {}
): StorageRepository => {
  const secure = options.secure ?? true;

  // ✅ Parse incoming cookies
  const cookiesData = cookie.parse(req.headers.cookie || "");
  const cache = new Map<string, string>(Object.entries(cookiesData));

  return {
    getItem(key) {
      return cache.get(key) ?? null;
    },
    removeItem(key) {
      cache.delete(key);
      res.clearCookie(key);
    },
    setItem(key, value) {
      try {
        cache.set(key, value);
        const expires = tryGetExpFromJwt(value);
        res.cookie(key, value, {
          httpOnly: true,
          sameSite: "lax",
          secure,
          expires,
        });
      } catch {
        // noop
      }
    },
  };
};

/**
 * This function assumes that the token is a JWT and gets the expiration date from it.
 * It silences all errors and returns undefined instead.
 */
const tryGetExpFromJwt = (token: string) => {
  try {
    const exp = (JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: unknown }).exp;
    const nowInSeconds = Date.now() / 1000;
    if (exp && typeof exp === "number" && exp > nowInSeconds) {
      return new Date(exp * 1000);
    }
  } catch {
    // silence is golden
  }
  return undefined;
};
