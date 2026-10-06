import { analyticsDb } from "@workspace/analytics-db";
import { handleBackchannelLogout } from "@workspace/core/oidc";
import { serverEnv } from "@/lib/config.server";
import { ACCOUNTS_PROVIDER_ID } from "@/lib/sso";

export const dynamic = "force-dynamic";

// Called by accounts (not by browsers) when a user's accounts session ends, so signing out
// in any app signs the user out here too (D19, OIDC Back-Channel Logout). Registered as this
// client's backchannelLogoutUri by the accounts seed.
export async function POST(request: Request) {
  return handleBackchannelLogout(request, serverEnv.ANALYTICS_OAUTH_CLIENT_ID, async ({ sub }) => {
    // `sub` is the accounts user id, stored as account.accountId by genericOAuth. All of the
    // user's sessions here end: this app does not record which accounts session (`sid`)
    // each local session came from.
    const link = await analyticsDb.account.findFirst({
      where: { providerId: ACCOUNTS_PROVIDER_ID, accountId: sub },
      select: { userId: true },
    });
    if (!link) return 0;
    const { count } = await analyticsDb.session.deleteMany({ where: { userId: link.userId } });
    return count;
  });
}
