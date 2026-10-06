import type { Metadata } from "next";
import { accountsDb } from "@workspace/accounts-db";
import { ConsentForm } from "@/components/auth/ConsentForm";
import { requireAuth } from "@/lib/session";

export const metadata: Metadata = {
  title: "Allow Access | Accounts",
};

// oauthProvider sends the user here (signed query, signed-in session) when a client
// that is not marked skipConsent asks for scopes the user hasn't granted yet. First-party
// clients like `web` never land here; third-party ones would hit a 404 without it.
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const clientId = typeof params.client_id === "string" ? params.client_id : null;
  const scopes = typeof params.scope === "string" ? params.scope.split(" ").filter(Boolean) : [];

  await requireAuth("/account");

  const client = clientId
    ? await accountsDb.oauthClient.findUnique({
        where: { clientId },
        select: { name: true, uri: true },
      })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <ConsentForm
        clientName={client?.name ?? clientId ?? "An application"}
        clientUri={client?.uri ?? null}
        scopes={scopes}
      />
    </div>
  );
}
