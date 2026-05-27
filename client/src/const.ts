export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Pass inviteToken to encode the invite return path in the OAuth state.
export const getLoginUrl = (inviteToken?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  // Use /manus-oauth/callback — this is the path registered in the Manus
  // token exchange API allowlist for this App ID. Our Express server handles
  // this route directly, bypassing the platform's broken proxy handler.
  const redirectUri = `${window.location.origin}/manus-oauth/callback`;
  // Encode state as "<redirectUri>|invite:<token>" when an invite token is present
  const statePayload = inviteToken ? `${redirectUri}|invite:${inviteToken}` : redirectUri;
  const state = btoa(statePayload);
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};
