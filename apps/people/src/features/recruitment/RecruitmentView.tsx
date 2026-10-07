"use client";

import { useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@workspace/ui/button";
import { Card } from "@workspace/ui/card";
import { CandidatesTable } from "./CandidatesTable";
import { CreateCandidateForm } from "./CreateCandidateForm";
import { useCandidates } from "./queries";
import type { CandidateRow } from "./schema";

const NO_CANDIDATES: CandidateRow[] = [];

export function RecruitmentView() {
  const candidates = useCandidates();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-white">Recruitment Pipeline</h2>
          <p className="text-sm text-slate-400">
            {candidates.data
              ? `${candidates.data.length} candidate${candidates.data.length === 1 ? "" : "s"} in pipeline.`
              : "Active candidate applicants and hiring pipeline."}
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
              <UserPlus className="mr-1.5 h-4 w-4" /> Add candidate
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <CreateCandidateForm onCreated={() => setShowForm(false)} />
        </Card>
      )}

      {candidates.isLoading ? (
        <div className="flex items-center gap-3 py-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm">Loading candidates…</span>
        </div>
      ) : candidates.error ? (
        <p className="text-sm text-red-400">{candidates.error.message}</p>
      ) : (
        <CandidatesTable data={candidates.data ?? NO_CANDIDATES} />
      )}
    </div>
  );
}
