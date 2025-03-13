import type { Request, Response } from "express";
import { serialize } from "cookie";
import { FylindeExternalAuth } from "../FylindeExternalAuth";

export const createFylindeExternalAuthHandler =
  (auth: FylindeExternalAuth) => async (req: Request, res: Response): Promise<void> => {
    try {
      const { state, code } = req.query as { state?: string; code?: string };

      if (!state || !code) {
        res.status(400).json({ error: "Missing state or code in query parameters." });
        return;
      }

      const response = await auth.obtainAccessToken({ state, code });

      if (!response || !response.token) {
        res.status(500).json({ error: "Failed to obtain access token." });
        return;
      }

      res.setHeader("Set-Cookie", serialize("token", response.token, { path: "/", httpOnly: true, secure: true, sameSite: "lax" }));
      res.redirect("/");
    } catch (error) {
      console.error("Error in external auth handler:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
