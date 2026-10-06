import { operationsUrl } from "@workspace/core/urls";
import { createAuthClient } from "better-auth/react";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

// No client plugin needed: since Better Auth 1.7, genericOAuth providers are regular
// social providers, signed in with signIn.social({ provider }).
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : operationsUrl,
});

let signInPromise: Promise<boolean> | null = null;

/**
 * Starts the OIDC handshake with accounts. Each call writes a new state cookie, so a
 * second concurrent call (a double click, or React running an effect twice in
 * development) would overwrite the first one's state and end in `state_mismatch`.
 * Repeated calls share the one in-flight request instead.
 *
 * Resolves to false when the handshake could not be started.
 */
export function signInWithAccounts(callbackURL: string): Promise<boolean> {
  signInPromise ??= authClient.signIn
    .social({
      provider: ACCOUNTS_PROVIDER_ID,
      callbackURL,
      // Callback errors (state_mismatch, access_denied, ...) come back to the home
      // page as ?error=..., which shows them with a retry button.
      errorCallbackURL: "/",
    })
    .then((result) => {
      // On success the browser is already leaving for accounts; reset only after an
      // error, so the user can retry.
      if (result.error) signInPromise = null;
      return !result.error;
    });
  return signInPromise;
}
