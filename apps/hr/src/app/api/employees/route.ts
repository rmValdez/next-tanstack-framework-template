import { createEmployee, listEmployees } from "@/features/employees/server";
import { createEmployeeSchema } from "@/features/employees/schema";
import { requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

// Matched by code, not `instanceof Prisma.PrismaClientKnownRequestError`: Next bundles the
// workspace package, so the error can come from a different copy of the class.
function prismaErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

export async function GET() {
  const { response } = await requireApiSession();
  if (response) return response;

  return Response.json(await listEmployees());
}

export async function POST(request: Request) {
  const { response } = await requireApiSession();
  if (response) return response;

  const parsed = createEmployeeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid employee", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    return Response.json(await createEmployee(parsed.data), { status: 201 });
  } catch (error) {
    const code = prismaErrorCode(error);
    // Unique constraint (employee number or email).
    if (code === "P2002") {
      return Response.json(
        { error: "An employee with this number or email already exists." },
        { status: 409 }
      );
    }
    // Foreign key: the department doesn't exist.
    if (code === "P2003") {
      return Response.json({ error: "Unknown department." }, { status: 400 });
    }
    throw error;
  }
}
