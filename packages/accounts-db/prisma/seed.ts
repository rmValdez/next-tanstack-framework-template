import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { parseEnv } from "@workspace/core/env";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { accountsDb } from "../src/client";

const env = parseEnv(
  z.object({
    NEXT_PUBLIC_WEB_URL: z.string().url(),
    WEB_OAUTH_CLIENT_ID: z.string().min(1),
    WEB_OAUTH_CLIENT_SECRET: z
      .string()
      .min(32, "WEB_OAUTH_CLIENT_SECRET must be at least 32 characters."),
  }),
  process.env,
  "seed"
);

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

async function seedWebClient() {
  const webUrl = env.NEXT_PUBLIC_WEB_URL.replace(/\/+$/, "");
  const now = new Date();

  // First-party client: consent is skipped, PKCE is required, and the redirect URI is
  // matched exactly against what genericOAuth sends (`/api/auth/callback/<providerId>`).
  const client = {
    clientSecret: hashClientSecret(env.WEB_OAUTH_CLIENT_SECRET),
    name: "Web",
    uri: webUrl,
    redirectUris: [`${webUrl}/api/auth/callback/accounts`],
    postLogoutRedirectUris: [webUrl],
    scopes: ["openid", "profile", "email", "offline_access"],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    // The token endpoint rejects any other method than the registered one, so `web`'s
    // genericOAuth config must use `authentication: "basic"`.
    tokenEndpointAuthMethod: "client_secret_basic",
    applicationType: "web",
    skipConsent: true,
    requirePKCE: true,
    enableEndSession: true,
    disabled: false,
    updatedAt: now,
  };

  await accountsDb.oauthClient.upsert({
    where: { clientId: env.WEB_OAUTH_CLIENT_ID },
    update: client,
    create: { id: randomUUID(), clientId: env.WEB_OAUTH_CLIENT_ID, createdAt: now, ...client },
  });
}

async function main() {
  await seedAdmin();
  await seedWebClient();

  console.log("Seeded accounts_db:");
  console.log(`  User:         ${DEFAULT_USER.email} / ${DEFAULT_USER.password}`);
  console.log(`  OAuth client: ${env.WEB_OAUTH_CLIENT_ID}`);
}

main()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await accountsDb.$disconnect();
  });
