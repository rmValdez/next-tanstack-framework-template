import { peopleUrl } from "./urls";

// APIs that domains expose to other domains (D18, D21). One definition shared by accounts (which
// issues tokens for them), its seed (which links calling clients), the owner (which verifies
// tokens) and callers (which request them), so the four can never disagree.
//
// `identifier` is the RFC 8707 resource indicator: the `resource` a caller asks for and the
// `aud` of the issued JWT. It must be an absolute URI.

const PEOPLE_RESOURCE = {
  identifier: `${peopleUrl}/api/v1`,
  name: "People API",
  scopes: {
    employeesRead: "people:employees.read",
    hrEmployeesRead: "hr:employees.read",
  },
} as const;

export const API_RESOURCES = {
  people: PEOPLE_RESOURCE,
  hr: PEOPLE_RESOURCE,
} as const;

export const hr = PEOPLE_RESOURCE;

// ─── Response contracts ─────────────────────────────────────────────────────
// What an API returns to other domains: a read model chosen by the owner, never its table
// shape. Versioned with the path: a breaking change is a new type and a new /api/v2 route.

/** GET {people}/api/v1/employees and /api/v1/employees/:id. No salary: that stays in People. */
export interface HrEmployeeV1 {
  id: string;
  employeeNo: string;
  fullName: string;
  email: string;
  position: string;
  departmentCode: string;
  departmentName: string;
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED";
}

export type PeopleEmployeeV1 = HrEmployeeV1;
export type ApiResource = (typeof API_RESOURCES)[keyof typeof API_RESOURCES];

/** Every scope any API defines; accounts must list them in its supported scopes. */
export const API_SCOPES: string[] = Array.from(
  new Set(
    Object.values(API_RESOURCES).flatMap((resource) =>
      Object.values(resource.scopes)
    )
  )
);

/** Which app may call which API with which scopes. Read by the accounts seed, which maps the
 * app to its OAuth client id. */
export const API_GRANTS: { app: string; resource: ApiResource; scopes: string[] }[] = [
  {
    app: "finance",
    resource: API_RESOURCES.people,
    scopes: [API_RESOURCES.people.scopes.employeesRead, API_RESOURCES.people.scopes.hrEmployeesRead],
  },
];
