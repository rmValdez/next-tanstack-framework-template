import { RecruitmentView } from "@/features/recruitment/RecruitmentView";
import { requireAuth } from "@/lib/session";

export default async function RecruitmentPage() {
  await requireAuth("/recruitment");

  return <RecruitmentView />;
}
