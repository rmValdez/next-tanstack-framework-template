import { oauthProvider } from "@better-auth/oauth-provider";
import { accountsDb } from "@workspace/accounts-db";
import { API_RESOURCES, API_SCOPES } from "@workspace/core/apis";
import { MIN_PASSWORD_LENGTH } from "@workspace/core/env";
import {
  accountsUrl,
  peopleUrl,
  hrUrl,
  financeUrl,
  recruitmentUrl,
  attendanceUrl,
  examUrl,
  crmUrl,
  operationsUrl,
  analyticsUrl,
  collaborationUrl,
  workspaceUrl,
} from "@workspace/core/urls";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { serverEnv } from "@/lib/config.server";
import { queueEmail } from "@/lib/email";

// When adding or removing a plugin here, update packages/accounts-db/scripts/auth-schema.ts
// and run `pnpm auth:schema` there, so the database has the plugin's tables.
export const auth = betterAuth({
  appName: "Accounts",
  database: prismaAdapter(accountsDb, {
    provider: "postgresql",
  }),
  secret: serverEnv.ACCOUNTS_AUTH_SECRET,
  baseURL: accountsUrl,
  // Domain apps are sent back here by the end-session redirect and may call accounts
  // from the browser; Better Auth rejects origins it doesn't know.
  trustedOrigins: [
    peopleUrl,
    hrUrl,
    financeUrl,
    recruitmentUrl,
    attendanceUrl,
    examUrl,
    crmUrl,
    operationsUrl,
    analyticsUrl,
    collaborationUrl,
    workspaceUrl,
  ],
  advanced: {
    // On localhost every app shares one cookie jar (cookies ignore ports), so each app
    // needs its own prefix or their session cookies overwrite each other.
    cookiePrefix: "accounts",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Unverified users cannot create a session. Sign-up returns no session and the
    // UI shows a "check your email" state instead. The seeded admin is created with
    // emailVerified: true, so it is unaffected.
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await queueEmail({
        template: "reset-password",
        to: user.email,
        data: { name: user.name, url },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Resends are explicit (the "Resend verification email" button on /login)
    // rather than triggered by every failed sign-in attempt.
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await queueEmail({
        template: "verify-email",
        to: user.email,
        data: { name: user.name, url },
      });
    },
  },
  rateLimit: {
    // Better Auth only enables this in production by default; enabling it
    // everywhere keeps local behavior identical to deployed behavior.
    enabled: true,
    // In-memory storage is per-process. Behind multiple instances or on
    // serverless, switch to "database" (needs a RateLimit model) or
    // "secondary-storage" (e.g. Redis) so limits are shared.
    storage: "memory",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },
  plugins: [
    // Signs ID tokens and publishes the keys at /api/auth/jwks.
    jwt(),
    oauthProvider({
      // Unauthenticated /oauth2/authorize requests are sent here with a signed query;
      // the auth client's oauthProviderClient() plugin resumes them after sign-in.
      loginPage: "/login",
      // Required even though every domain app is registered with skipConsent: any other
      // client would otherwise be sent to a page that doesn't exist.
      consentPage: "/consent",
      // OIDC scopes plus the scopes of the domain APIs (D18). Listing them here is what
      // lets accounts issue them at all.
      scopes: ["openid", "profile", "email", "offline_access", ...API_SCOPES],
      // Domain APIs accounts issues app tokens for: the token's `aud` is the identifier and
      // only the listed scopes are allowed. "overwrite" keeps the database in step with this
      // config on every start; resources are code-defined, not edited by admins.
      resources: Object.values(API_RESOURCES).map((resource) => ({
        identifier: resource.identifier,
        name: resource.name,
        allowedScopes: Object.values(resource.scopes),
      })),
      resourceSeedMode: "overwrite",
    }),
    // Must stay last: lets server actions set cookies through next/headers.
    nextCookies(),
  ],
});
