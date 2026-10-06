import { accountsUrl, attendanceUrl } from "@workspace/core/urls";
import { attendanceDb } from "@workspace/attendance-db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { serverEnv } from "@/lib/config.server";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

// attendance has no passwords: every user signs in through accounts over OIDC, and this app
// keeps a shadow user plus its own session in attendance_db.
export const auth = betterAuth({
  appName: "Attendance",
  database: prismaAdapter(attendanceDb, {
    provider: "postgresql",
  }),
  secret: serverEnv.ATTENDANCE_AUTH_SECRET,
  baseURL: attendanceUrl,
  advanced: {
    // On localhost every app shares one cookie jar (cookies ignore ports), so each app
    // needs its own prefix or their session cookies overwrite each other.
    cookiePrefix: "attendance",
    cookies: {
      // The state cookie defaults to 5 minutes, and that budget covers the whole trip
      // through accounts (sign-in, maybe a password reset); philgeps users came back
      // to `state_mismatch` after a slow login. 10 minutes is the ceiling worth
      // setting: the matching verification row expires after 10 minutes regardless.
      state: { attributes: { maxAge: 600 } },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the expiry once a day of activity
  },
  rateLimit: {
    // Same reasoning as accounts: keep local behavior identical to production.
    enabled: true,
    storage: "memory",
    window: 60,
    max: 100,
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: ACCOUNTS_PROVIDER_ID,
          name: "Accounts",
          clientId: serverEnv.ATTENDANCE_OAUTH_CLIENT_ID,
          clientSecret: serverEnv.ATTENDANCE_OAUTH_CLIENT_SECRET,
          discoveryUrl: `${accountsUrl}/api/auth/.well-known/openid-configuration`,
          // accounts only accepts the auth method the client was registered with, and
          // the seed registers attendance as client_secret_basic.
          tokenEndpointAuth: { method: "client_secret_basic" },
          scopes: ["openid", "profile", "email"],
          pkce: true,
          // accounts publishes its JWKS, so refuse an incomplete discovery document
          // rather than fall back to unverified ID-token decoding.
          requireIdTokenVerification: true,
          // Copy name and email from accounts on every sign-in. Without it the shadow
          // user keeps what accounts said the first time, so an email change there
          // would never reach attendance (traced in philgeps).
          overrideUserInfo: true,
          // Where accounts' end-session sends the browser after "Sign out everywhere".
          // Must be one of the client's registered postLogoutRedirectUris.
          postLogoutRedirectURI: attendanceUrl,
        },
      ],
    }),
    // Must stay last: lets server actions set cookies through next/headers.
    nextCookies(),
  ],
});
