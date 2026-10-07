import { hireCandidate } from "@/features/recruitment/server";
import { hireCandidateSchema } from "@/features/recruitment/schema";
import { requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

function prismaErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

export async function POST(request: Request) {
  const { response } = await requireApiSession();
  if (response) return response;

  const parsed = hireCandidateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid hire payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await hireCandidate(parsed.data);
    return Response.json(result, { status: 201 });
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2002") {
      return Response.json(
        { error: "An employee with this number or email already exists." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message.includes("Candidate is already hired")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/recruitment/hire] Error:", error);
    return Response.json({ error: "Failed to complete hiring transaction" }, { status: 500 });
  }
}
