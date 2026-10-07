"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, UserCheck } from "lucide-react";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@workspace/ui/button";
import { cn } from "@workspace/ui/cn";
import { HireCandidateDialog } from "./HireCandidateDialog";
import type { CandidateRow } from "./schema";

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const helper = createColumnHelper<typeof features, CandidateRow>();

const STATUS_STYLES: Record<CandidateRow["status"], string> = {
  APPLIED: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  SCREENING: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  INTERVIEWING: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  OFFERED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  HIRED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export function CandidatesTable({ data }: { data: CandidateRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "fullName", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [candidateToHire, setCandidateToHire] = useState<CandidateRow | null>(null);

  const columns = helper.columns([
    helper.accessor("fullName", {
      header: "Candidate",
      sortFn: "alphanumeric",
      cell: (info) => (
        <div>
          <p className="font-medium text-slate-100">{info.getValue()}</p>
          <p className="text-xs text-slate-400">{info.row.original.email}</p>
        </div>
      ),
    }),
    helper.accessor((row) => row.jobOpening.title, {
      id: "opening",
      header: "Job Opening",
      sortFn: "alphanumeric",
    }),
    helper.accessor("status", {
      header: "Status",
      sortFn: "alphanumeric",
      cell: (info) => {
        const status = info.getValue();
        return (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              STATUS_STYLES[status]
            )}
          >
            {status.toLowerCase()}
          </span>
        );
      },
    }),
    helper.accessor("employeeNo", {
      header: "Linked Employee",
      cell: (info) => {
        const empNo = info.getValue();
        return empNo ? (
          <span className="font-mono text-xs text-cyan-400">{empNo}</span>
        ) : (
          <span className="text-slate-500">—</span>
        );
      },
    }),
    helper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const candidate = info.row.original;
        if (candidate.status === "HIRED") {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <UserCheck className="h-3.5 w-3.5" /> Hired
            </span>
          );
        }
        return (
          <Button
            variant="outline"
            className="h-7 px-2.5 text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
            onClick={() => setCandidateToHire(candidate)}
          >
            Hire Candidate
          </Button>
        );
      },
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      <label className="relative block max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <span className="sr-only">Search candidates</span>
        <input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search candidates…"
          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
        />
      </label>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const SortIcon =
                    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
                  return (
                    <th key={header.id} scope="col" className="px-4 py-3 font-medium">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 hover:text-slate-200"
                        >
                          <table.FlexRender header={header} />
                          <SortIcon className={cn("h-3 w-3", !sorted && "opacity-40")} />
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  {globalFilter ? "No candidates match your search." : "No candidates found."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/50">
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-slate-200">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {candidateToHire && (
        <HireCandidateDialog
          candidate={candidateToHire}
          onClose={() => setCandidateToHire(null)}
        />
      )}
    </div>
  );
}
