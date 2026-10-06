import { createPayrollSchema } from "@/features/payroll/schema";
import { createPayrollEntry, listPayroll, PayrollError } from "@/features/payroll/server";
import { requireApiSession } from "@/lib/api";
import { HrUnavailableError } from "@/lib/hr-client";

export const dynamic = "force-dynamic";

// Matched by code, not instanceof: Next bundles the workspace package, so the error can
// come from a different copy of Prisma's error class (see apps/hr).
function prismaErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

// Payroll needs HR to name and validate employees; without it, say so instead of a 500.
function hrUnavailable(error: HrUnavailableError) {
  console.error("[finance] HR API:", error.message);
  return Response.json({ error: "HR is unavailable. Try again shortly." }, { status: 503 });
}

export async function GET() {
  const { response } = await requireApiSession();
  if (response) return response;

  try {
    return Response.json(await listPayroll());
  } catch (error) {
    if (error instanceof HrUnavailableError) return hrUnavailable(error);
    throw error;
  }
}

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (response) return response;

  const parsed = createPayrollSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payroll entry", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await createPayrollEntry(parsed.data, session.user.id);
    return new Response(null, { status: 201 });
  } catch (error) {
    if (error instanceof HrUnavailableError) return hrUnavailable(error);
    if (error instanceof PayrollError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (prismaErrorCode(error) === "P2002") {
      return Response.json(
        { error: "This employee already has a payroll entry for that month." },
        { status: 409 }
      );
    }
    throw error;
  }
}
