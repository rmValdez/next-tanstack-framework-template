import { createFileRoute } from "@tanstack/react-router";
import { handleBackchannelLogout } from "@workspace/core/oidc";
import { collaborationDb } from "@workspace/collaboration-db";
import { serverEnv } from "@/lib/config.server";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

// Called by accounts (not by browsers) when a user's accounts session ends, so signing out in
// any app signs the user out here too (D19, OIDC Back-Channel Logout). Same contract as the
// Next apps' route; the verification lives in @workspace/core/oidc.
export const Route = createFileRoute("/api/backchannel-logout")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleBackchannelLogout(
          request,
          serverEnv.COLLABORATION_OAUTH_CLIENT_ID,
          async ({ sub }) => {
            const link = await collaborationDb.account.findFirst({
              where: { providerId: ACCOUNTS_PROVIDER_ID, accountId: sub },
              select: { userId: true },
            });
            if (!link) return 0;
            const { count } = await collaborationDb.session.deleteMany({
              where: { userId: link.userId },
            });
            return count;
          }
        ),
    },
  },
});
