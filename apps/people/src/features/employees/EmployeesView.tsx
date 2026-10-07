"use client";

import { useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";
import { CreateEmployeeForm } from "./CreateEmployeeForm";
import { EmployeesTable } from "./EmployeesTable";
import { useEmployees } from "./queries";
import type { EmployeeRow } from "./schema";

// Stable fallback: a new [] on every render would rebuild the table's row models.
const NO_EMPLOYEES: EmployeeRow[] = [];

export function EmployeesView() {
  const employees = useEmployees();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-white">Employees</h2>
          <p className="text-sm text-slate-400">
            {employees.data
              ? `${employees.data.length} employee${employees.data.length === 1 ? "" : "s"}`
              : "HR's employee records."}
          </p>
        </div>
        <Button
          variant={showForm ? "outline" : "primary"}
          onClick={() => setShowForm((open) => !open)}
        >
          {showForm ? (
            <>
              <X className="mr-1.5 h-4 w-4" /> Close
            </>
          ) : (
            <>
              <UserPlus className="mr-1.5 h-4 w-4" /> Add employee
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <CreateEmployeeForm onCreated={() => setShowForm(false)} />
        </Card>
      )}

      {employees.isLoading ? (
        <div className="flex items-center gap-3 py-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm">Loading employees…</span>
        </div>
      ) : employees.error ? (
        <p className="text-sm text-red-400">{employees.error.message}</p>
      ) : (
        <EmployeesTable data={employees.data ?? NO_EMPLOYEES} />
      )}
    </div>
  );
}
