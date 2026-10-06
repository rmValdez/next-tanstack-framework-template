import { createHash, randomUUID } from "node:crypto";
import { parseEnv } from "@workspace/core/env";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { accountsDb } from "../src/client";

const env = parseEnv(
  z.object({
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
  }),
  process.env,
  "seed"
);

// One entry per domain app that signs in through accounts. A new app adds its URL and
// client credentials to the schema above and an entry here.
const CLIENTS = [
  {
    name: "HR",
    clientId: env.HR_OAUTH_CLIENT_ID,
    clientSecret: env.HR_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_HR_URL,
  },
  {
    name: "Finance",
    clientId: env.FINANCE_OAUTH_CLIENT_ID,
    clientSecret: env.FINANCE_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_FINANCE_URL,
  },
  {
    name: "Recruitment",
    clientId: env.RECRUITMENT_OAUTH_CLIENT_ID,
    clientSecret: env.RECRUITMENT_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_RECRUITMENT_URL,
  },
  {
    name: "Attendance",
    clientId: env.ATTENDANCE_OAUTH_CLIENT_ID,
    clientSecret: env.ATTENDANCE_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_ATTENDANCE_URL,
  },
  {
    name: "Exam",
    clientId: env.EXAM_OAUTH_CLIENT_ID,
    clientSecret: env.EXAM_OAUTH_CLIENT_SECRET,
    url: env.NEXT_PUBLIC_EXAM_URL,
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

async function seedClient({ name, clientId, clientSecret, url }: (typeof CLIENTS)[number]) {
  const appUrl = url.replace(/\/+$/, "");
  const now = new Date();

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
    scopes: ["openid", "profile", "email", "offline_access"],
    grantTypes: ["authorization_code", "refresh_token"],
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
}

async function main() {
  await seedAdmin();
  for (const client of CLIENTS) {
    await seedClient(client);
  }

  console.log("Seeded accounts_db:");
  console.log(`  User:          ${DEFAULT_USER.email} / ${DEFAULT_USER.password}`);
  console.log(`  OAuth clients: ${CLIENTS.map((c) => c.clientId).join(", ")}`);
}

main()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await accountsDb.$disconnect();
  });
