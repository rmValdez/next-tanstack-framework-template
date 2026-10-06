"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";
import { CreatePayrollForm } from "./CreatePayrollForm";
import { PayrollTable } from "./PayrollTable";
import { usePayroll } from "./queries";
import type { PayrollRow } from "./schema";

// Stable fallback: a new [] on every render would rebuild the table's row models.
const NO_ENTRIES: PayrollRow[] = [];

export function PayrollView() {
  const payroll = usePayroll();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-white">Payroll</h2>
          <p className="text-sm text-slate-400">
            Finance owns these entries. Employee names come from HR&apos;s published directory.
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
              <Plus className="mr-1.5 h-4 w-4" /> Record entry
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <CreatePayrollForm onCreated={() => setShowForm(false)} />
        </Card>
      )}

      {payroll.isLoading ? (
        <div className="flex items-center gap-3 py-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm">Loading payroll…</span>
        </div>
      ) : payroll.error ? (
        <p className="text-sm text-red-400">{payroll.error.message}</p>
      ) : (
        <PayrollTable data={payroll.data ?? NO_ENTRIES} />
      )}
    </div>
  );
}
