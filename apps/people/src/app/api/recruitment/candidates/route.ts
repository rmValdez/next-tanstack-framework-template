import { createCandidate, listCandidates } from "@/features/recruitment/server";
import { createCandidateSchema } from "@/features/recruitment/schema";
import { requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireApiSession();
  if (response) return response;

  return Response.json(await listCandidates());
}

export async function POST(request: Request) {
  const { response } = await requireApiSession();
  if (response) return response;

  const parsed = createCandidateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid candidate data", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    return Response.json(await createCandidate(parsed.data), { status: 201 });
  } catch (error) {
    console.error("[api/recruitment/candidates] Error:", error);
    return Response.json({ error: "Failed to create candidate" }, { status: 500 });
  }
}
