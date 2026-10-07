import { peopleDb } from "@workspace/people-db";
import type {
  CandidateRow,
  CreateCandidateInput,
  HireCandidateInput,
  JobOpeningOption,
} from "./schema";

const candidateSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  status: true,
  jobOpening: { select: { id: true, title: true } },
  employee: { select: { id: true, employeeNo: true } },
  employeeId: true,
  hiredAt: true,
  notes: true,
  createdAt: true,
} as const;

type SelectedCandidate = Awaited<
  ReturnType<typeof peopleDb.candidate.findFirstOrThrow<{ select: typeof candidateSelect }>>
>;

function toCandidateRow(cand: SelectedCandidate): CandidateRow {
  return {
    id: cand.id,
    fullName: cand.fullName,
    email: cand.email,
    phone: cand.phone,
    status: cand.status,
    jobOpening: cand.jobOpening,
    employeeId: cand.employeeId,
    employeeNo: cand.employee?.employeeNo ?? null,
    hiredAt: cand.hiredAt?.toISOString() ?? null,
    notes: cand.notes,
    createdAt: cand.createdAt.toISOString().slice(0, 10),
  };
}

export async function listJobOpenings(): Promise<JobOpeningOption[]> {
  const openings = await peopleDb.jobOpening.findMany({
    select: {
      id: true,
      title: true,
      departmentId: true,
      department: { select: { name: true } },
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return openings;
}

export async function listCandidates(): Promise<CandidateRow[]> {
  const candidates = await peopleDb.candidate.findMany({
    select: candidateSelect,
    orderBy: { createdAt: "desc" },
  });
  return candidates.map(toCandidateRow);
}

export async function createCandidate(input: CreateCandidateInput): Promise<CandidateRow> {
  const candidate = await peopleDb.candidate.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone || null,
      jobOpeningId: input.jobOpeningId,
      notes: input.notes || null,
      status: "APPLIED",
    },
    select: candidateSelect,
  });
  return toCandidateRow(candidate);
}

/**
 * Atomic hiring transition: converts candidate -> employee in a single DB transaction.
 * Demonstrates the benefit of consolidating HR + Recruitment into the People bounded context!
 */
export async function hireCandidate(input: HireCandidateInput) {
  return peopleDb.$transaction(async (tx) => {
    const candidate = await tx.candidate.findUniqueOrThrow({
      where: { id: input.candidateId },
    });

    if (candidate.status === "HIRED") {
      throw new Error("Candidate is already hired.");
    }

    // Create the Employee record
    const employee = await tx.employee.create({
      data: {
        employeeNo: input.employeeNo,
        fullName: candidate.fullName,
        email: candidate.email,
        position: input.position,
        departmentId: input.departmentId,
        hiredOn: new Date(input.hiredOn),
        monthlySalary: input.monthlySalary,
        status: "ACTIVE",
      },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        email: true,
      },
    });

    // Update the Candidate record to link with new employee
    const updatedCandidate = await tx.candidate.update({
      where: { id: input.candidateId },
      data: {
        status: "HIRED",
        employeeId: employee.id,
        hiredAt: new Date(),
      },
      select: candidateSelect,
    });

    return {
      employee,
      candidate: toCandidateRow(updatedCandidate),
    };
  });
}
