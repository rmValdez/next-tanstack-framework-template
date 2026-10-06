import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { accountsUrl } from "@workspace/core/urls";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : accountsUrl,
  // Attaches the signed /login query (`oauth_query`) to sign-in requests, so a sign-in
  // that started from a client app's /oauth2/authorize resumes it automatically.
  plugins: [oauthProviderClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
