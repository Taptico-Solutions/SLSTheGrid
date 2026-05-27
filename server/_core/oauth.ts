import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // ── Platform proxy intercept ──────────────────────────────────────────────
  // The Manus platform intercepts unauthenticated requests and redirects them
  // through /manus-oauth/callback using its own broken proxy. We intercept
  // that route here and handle the token exchange ourselves using the same
  // logic as /api/oauth/callback, but we reconstruct the state so that the
  // redirectUri matches what the Manus API expects for this app.
  app.get("/manus-oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // The platform sends a state that encodes the app root URL as the
    // redirectUri (e.g. https://slsgrid-mfzlzcyi.manus.space/).  We need to
    // reconstruct a state whose decoded value is the /api/oauth/callback URL
    // so that the Manus token exchange API accepts it.
    try {
      // Decode the incoming state to extract the origin
      const decodedState = Buffer.from(state, "base64").toString("utf8");
      // decodedState is typically "https://<host>/" — extract origin
      let origin: string;
      try {
        const u = new URL(decodedState);
        origin = u.origin; // e.g. https://slsgrid-mfzlzcyi.manus.space
      } catch {
        // Fallback: strip trailing slash
        origin = decodedState.replace(/\/$/, "");
      }

      // Build the redirectUri our /api/oauth/callback expects
      const redirectUri = `${origin}/api/oauth/callback`;
      // Re-encode as base64 state so sdk.decodeState() extracts the right URI
      const reEncodedState = Buffer.from(redirectUri).toString("base64");

      console.log(`[OAuth] Platform proxy intercept — redirecting token exchange to ${redirectUri}`);

      const tokenResponse = await sdk.exchangeCodeForToken(code, reEncodedState);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Handle invite token redirect if encoded in state
      let redirectTo = "/";
      const parts = decodedState.split("|");
      if (parts.length === 2 && parts[1].startsWith("invite:")) {
        const inviteToken = parts[1].slice(7);
        redirectTo = `/invite/${inviteToken}`;
      }

      res.redirect(302, redirectTo);
    } catch (error) {
      console.error("[OAuth] Platform proxy intercept failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // If the OAuth state encodes an invite token, redirect there after sign-in
      let redirectTo = "/";
      try {
        const decoded = Buffer.from(state, "base64").toString("utf8");
        // state format: "<redirectUri>|invite:<token>" or just "<redirectUri>"
        const parts = decoded.split("|");
        if (parts.length === 2 && parts[1].startsWith("invite:")) {
          const inviteToken = parts[1].slice(7);
          redirectTo = `/invite/${inviteToken}`;
        }
      } catch {
        // ignore malformed state — just redirect to home
      }

      res.redirect(302, redirectTo);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
