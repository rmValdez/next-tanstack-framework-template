import { createHash, randomUUID } from "node:crypto";
import { API_GRANTS, API_RESOURCES } from "@workspace/core/apis";
import { parseEnv } from "@workspace/core/env";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { accountsDb } from "../src/client";

const env = parseEnv(
  z.object({
    NEXT_PUBLIC_PEOPLE_URL: z.string().url().default("http://localhost:5010"),
    PEOPLE_OAUTH_CLIENT_ID: z.string().default("people"),
    PEOPLE_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "PEOPLE_OAUTH_CLIENT_SECRET must be at least 32 characters.")
      .default("change-me-people-oauth-client-secret-32-chars-x"),
    NEXT_PUBLIC_HR_URL: z.string().url(),
    HR_OAUTH_CLIENT_ID: z.string().min(1),
    HR_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "HR_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_FINANCE_URL: z.string().url(),
    FINANCE_OAUTH_CLIENT_ID: z.string().min(1),
    FINANCE_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "FINANCE_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_RECRUITMENT_URL: z.string().url(),
    RECRUITMENT_OAUTH_CLIENT_ID: z.string().min(1),
    RECRUITMENT_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "RECRUITMENT_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_ATTENDANCE_URL: z.string().url(),
    ATTENDANCE_OAUTH_CLIENT_ID: z.string().min(1),
    ATTENDANCE_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "ATTENDANCE_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_EXAM_URL: z.string().url(),
    EXAM_OAUTH_CLIENT_ID: z.string().min(1),
    EXAM_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "EXAM_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_CRM_URL: z.string().url(),
    CRM_OAUTH_CLIENT_ID: z.string().min(1),
    CRM_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "CRM_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_OPERATIONS_URL: z.string().url(),
    OPERATIONS_OAUTH_CLIENT_ID: z.string().min(1),
    OPERATIONS_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "OPERATIONS_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_ANALYTICS_URL: z.string().url(),
    ANALYTICS_OAUTH_CLIENT_ID: z.string().min(1),
    ANALYTICS_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "ANALYTICS_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_COLLABORATION_URL: z.string().url(),
    COLLABORATION_OAUTH_CLIENT_ID: z.string().min(1),
    COLLABORATION_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "COLLABORATION_OAUTH_CLIENT_SECRET must be at least 32 characters."),
    NEXT_PUBLIC_WORKSPACE_URL: z.string().url(),
    WORKSPACE_OAUTH_CLIENT_ID: z.string().min(1),
    WORKSPACE_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "WORKSPACE_OAUTH_CLIENT_SECRET must be at least 32 characters."),
  }),
  process.env,
  "seed"
);

// One entry per domain app that signs in through accounts. A new app adds its URL and
// client credentials to the schema above and an entry here. `app` links the client to
// API_GRANTS in @workspace/core/apis (which APIs it may call).
const CLIENTS = [
  {
    app: "people",
    name: "People",
    clientId: env.PEOPLE_OAUTH_CLIENT_ID,
    clientSecret: env.PEOPLE_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_PEOPLE_URL,
  },
  {
    app: "finance",
    name: "Finance",
    clientId: env.FINANCE_OAUTH_CLIENT_ID,
    clientSecret: env.FINANCE_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_FINANCE_URL,
  },
  {
    app: "exam",
    name: "Exam",
    clientId: env.EXAM_OAUTH_CLIENT_ID,
    clientSecret: env.EXAM_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_EXAM_URL,
  },
  {
    app: "crm",
    name: "CRM",
    clientId: env.CRM_OAUTH_CLIENT_ID,
    clientSecret: env.CRM_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_CRM_URL,
  },
  {
    app: "operations",
    name: "Operations",
    clientId: env.OPERATIONS_OAUTH_CLIENT_ID,
    clientSecret: env.OPERATIONS_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_OPERATIONS_URL,
  },
  {
    app: "analytics",
    name: "Analytics",
    clientId: env.ANALYTICS_OAUTH_CLIENT_ID,
    clientSecret: env.ANALYTICS_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_ANALYTICS_URL,
  },
  {
    app: "collaboration",
    name: "Collaboration",
    clientId: env.COLLABORATION_OAUTH_CLIENT_ID,
    clientSecret: env.COLLABORATION_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_COLLABORATION_URL,
  },
  {
    app: "workspace",
    name: "Workspace",
    clientId: env.WORKSPACE_OAUTH_CLIENT_ID,
    clientSecret: env.WORKSPACE_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_WORKSPACE_URL,
  },
];

export const DEFAULT_USER = {
  email: "admin@example.com",
  password: "password123",
  name: "Admin Operator",
};

// Must match the oauth-provider plugin's default `storeClientSecret: "hashed"`
// (SHA-256, base64url without padding), or the token endpoint rejects the secret.
function hashClientSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("base64url");
}

async function seedAdmin() {
  const passwordHash = await hashPassword(DEFAULT_USER.password);

  const user = await accountsDb.user.upsert({
    where: { email: DEFAULT_USER.email },
    update: { name: DEFAULT_USER.name, emailVerified: true },
    create: {
      id: randomUUID(),
      email: DEFAULT_USER.email,
      name: DEFAULT_USER.name,
      emailVerified: true,
    },
  });

  const existing = await accountsDb.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (existing) {
    await accountsDb.account.update({
      where: { id: existing.id },
      data: { password: passwordHash },
    });
  } else {
    await accountsDb.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }
}

const OIDC_SCOPES = ["openid", "profile", "email", "offline_access"];

async function seedClient({ app, name, clientId, clientSecret, url }: (typeof CLIENTS)[number]) {
  const appUrl = url.replace(/\/+$/, "");
  const now = new Date();

  // APIs this app may call with an app token (client credentials, D18).
  const grants = API_GRANTS.filter((grant) => grant.app === app);
  const apiScopes = [...new Set(grants.flatMap((grant) => grant.scopes))];

  // First-party client: consent is skipped, PKCE is required, and the redirect URI is
  // matched exactly against what genericOAuth sends (`/api/auth/callback/<providerId>`).
  const client = {
    clientSecret: hashClientSecret(clientSecret),
    name,
    uri: appUrl,
    redirectUris: [`${appUrl}/api/auth/callback/accounts`],
    // Matched exactly too. Better Auth's sign-out builds this with `new URL()`, which
    // always adds the trailing slash.
    postLogoutRedirectUris: [`${appUrl}/`],
    // Global sign-out (D19): when the user's accounts session ends, accounts POSTs a signed
    // logout token here and the app ends that user's sessions. Written directly, so the
    // https/public-host checks of dynamic registration don't block localhost in development.
    backchannelLogoutUri: `${appUrl}/api/backchannel-logout`,
    backchannelLogoutSessionRequired: false,
    scopes: [...OIDC_SCOPES, ...apiScopes],
    grantTypes: [
      "authorization_code",
      "refresh_token",
      ...(grants.length > 0 ? ["client_credentials"] : []),
    ],
    // The ceiling for client-credentials tokens; empty when the app calls no API.
    clientCredentialsScopes: apiScopes,
    responseTypes: ["code"],
    // The token endpoint rejects any other method than the registered one, so the app's
    // genericOAuth config must use `tokenEndpointAuth: { method: "client_secret_basic" }`.
    tokenEndpointAuthMethod: "client_secret_basic",
    applicationType: "web",
    skipConsent: true,
    requirePKCE: true,
    enableEndSession: true,
    disabled: false,
    updatedAt: now,
  };

  await accountsDb.oauthClient.upsert({
    where: { clientId },
    update: client,
    create: { id: randomUUID(), clientId, createdAt: now, ...client },
  });

  // With enforcePerClientResources (the default), a client may only request resources it is
  // linked to. Links are replaced so a grant removed from API_GRANTS is revoked here too.
  await accountsDb.oauthClientResource.deleteMany({ where: { clientId } });
  for (const { resource } of grants) {
    await accountsDb.oauthClientResource.create({
      data: { id: randomUUID(), clientId, resourceId: resource.identifier, createdAt: now },
    });
  }
}

// accounts also writes these rows at startup (oauthProvider `resources`, "overwrite"); the
// seed writes them first so client links can be created before accounts has ever run.
async function seedApiResources() {
  const now = new Date();
  for (const resource of Object.values(API_RESOURCES)) {
    const data = {
      name: resource.name,
      allowedScopes: Object.values(resource.scopes),
      updatedAt: now,
    };
    await accountsDb.oauthResource.upsert({
      where: { identifier: resource.identifier },
      update: data,
      create: { id: randomUUID(), identifier: resource.identifier, createdAt: now, ...data },
    });
  }
}

async function main() {
  await seedAdmin();
  await seedApiResources();
  for (const client of CLIENTS) {
    await seedClient(client);
  }

  console.log("Seeded accounts_db:");
  console.log(`  User:          ${DEFAULT_USER.email} / ${DEFAULT_USER.password}`);
  console.log(`  OAuth clients: ${CLIENTS.map((c) => c.clientId).join(", ")}`);
  console.log(
    `  API grants:    ${API_GRANTS.map((g) => `${g.app} → ${g.resource.name}`).join(", ")}`
  );
}

main()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await accountsDb.$disconnect();
  });
