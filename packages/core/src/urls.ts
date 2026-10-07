import { z } from "zod";
import { parseEnv } from "./env";

const urlsSchema = z.object({
  NEXT_PUBLIC_ACCOUNTS_URL: z.string().url().default("http://localhost:5011"),
  NEXT_PUBLIC_PEOPLE_URL: z.string().url().default("http://localhost:5010"),
  NEXT_PUBLIC_HR_URL: z.string().url().default("http://localhost:5010"),
  NEXT_PUBLIC_FINANCE_URL: z.string().url().default("http://localhost:5013"),
  NEXT_PUBLIC_RECRUITMENT_URL: z.string().url().default("http://localhost:5014"),
  NEXT_PUBLIC_ATTENDANCE_URL: z.string().url().default("http://localhost:5015"),
  NEXT_PUBLIC_EXAM_URL: z.string().url().default("http://localhost:5016"),
  NEXT_PUBLIC_CRM_URL: z.string().url().default("http://localhost:5017"),
  NEXT_PUBLIC_OPERATIONS_URL: z.string().url().default("http://localhost:5018"),
  NEXT_PUBLIC_ANALYTICS_URL: z.string().url().default("http://localhost:5019"),
  NEXT_PUBLIC_COLLABORATION_URL: z.string().url().default("http://localhost:5020"),
  NEXT_PUBLIC_WORKSPACE_URL: z.string().url().default("http://localhost:5021"),
});

// Referenced as literals, not iterated: Next.js only inlines `process.env.NEXT_PUBLIC_*`
// into the client bundle for statically analyzable member expressions.
const urls = parseEnv(
  urlsSchema,
  {
    NEXT_PUBLIC_ACCOUNTS_URL: process.env.NEXT_PUBLIC_ACCOUNTS_URL || undefined,
    NEXT_PUBLIC_PEOPLE_URL: process.env.NEXT_PUBLIC_PEOPLE_URL || undefined,
    NEXT_PUBLIC_HR_URL: process.env.NEXT_PUBLIC_HR_URL || undefined,
    NEXT_PUBLIC_FINANCE_URL: process.env.NEXT_PUBLIC_FINANCE_URL || undefined,
    NEXT_PUBLIC_RECRUITMENT_URL: process.env.NEXT_PUBLIC_RECRUITMENT_URL || undefined,
    NEXT_PUBLIC_ATTENDANCE_URL: process.env.NEXT_PUBLIC_ATTENDANCE_URL || undefined,
    NEXT_PUBLIC_EXAM_URL: process.env.NEXT_PUBLIC_EXAM_URL || undefined,
    NEXT_PUBLIC_CRM_URL: process.env.NEXT_PUBLIC_CRM_URL || undefined,
    NEXT_PUBLIC_OPERATIONS_URL: process.env.NEXT_PUBLIC_OPERATIONS_URL || undefined,
    NEXT_PUBLIC_ANALYTICS_URL: process.env.NEXT_PUBLIC_ANALYTICS_URL || undefined,
    NEXT_PUBLIC_COLLABORATION_URL: process.env.NEXT_PUBLIC_COLLABORATION_URL || undefined,
    NEXT_PUBLIC_WORKSPACE_URL: process.env.NEXT_PUBLIC_WORKSPACE_URL || undefined,
  },
  "public URL"
);

// Trailing slashes stripped so callers can always append "/path".
export const accountsUrl = urls.NEXT_PUBLIC_ACCOUNTS_URL.replace(/\/+$/, "");
export const peopleUrl = urls.NEXT_PUBLIC_PEOPLE_URL.replace(/\/+$/, "");
export const hrUrl = urls.NEXT_PUBLIC_HR_URL.replace(/\/+$/, "");
export const financeUrl = urls.NEXT_PUBLIC_FINANCE_URL.replace(/\/+$/, "");
export const recruitmentUrl = urls.NEXT_PUBLIC_RECRUITMENT_URL.replace(/\/+$/, "");
export const attendanceUrl = urls.NEXT_PUBLIC_ATTENDANCE_URL.replace(/\/+$/, "");
export const examUrl = urls.NEXT_PUBLIC_EXAM_URL.replace(/\/+$/, "");
export const crmUrl = urls.NEXT_PUBLIC_CRM_URL.replace(/\/+$/, "");
export const operationsUrl = urls.NEXT_PUBLIC_OPERATIONS_URL.replace(/\/+$/, "");
export const analyticsUrl = urls.NEXT_PUBLIC_ANALYTICS_URL.replace(/\/+$/, "");
export const collaborationUrl = urls.NEXT_PUBLIC_COLLABORATION_URL.replace(/\/+$/, "");
export const workspaceUrl = urls.NEXT_PUBLIC_WORKSPACE_URL.replace(/\/+$/, "");
