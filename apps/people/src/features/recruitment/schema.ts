import { z } from "zod";

export const CANDIDATE_STATUSES = [
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFERED",
  "HIRED",
  "REJECTED",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const createCandidateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter candidate's full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  jobOpeningId: z.string().min(1, "Select a job opening."),
  notes: z.string().trim().optional(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

// Atomic hire mutation schema: converts candidate into an employee within the People bounded context
export const hireCandidateSchema = z.object({
  candidateId: z.string().min(1, "Candidate ID is required."),
  employeeNo: z
    .string()
    .trim()
    .regex(/^E-\d{4,}$/, "Use the format E-0001."),
  position: z.string().trim().min(2, "Enter job position."),
  departmentId: z.string().min(1, "Choose a department."),
  hiredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose hire date."),
  monthlySalary: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter salary amount like 55000 or 55000.00."),
});

export type HireCandidateInput = z.infer<typeof hireCandidateSchema>;

export interface JobOpeningOption {
  id: string;
  title: string;
  departmentId: string;
  department: { name: string };
  status: "OPEN" | "CLOSED";
}

export interface CandidateRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: CandidateStatus;
  jobOpening: { id: string; title: string };
  employeeId: string | null;
  employeeNo: string | null;
  hiredAt: string | null;
  notes: string | null;
  createdAt: string;
}
