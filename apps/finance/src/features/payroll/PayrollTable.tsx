"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@workspace/ui/cn";
import type { PayrollRow } from "./schema";

// Same setup as apps/hr's EmployeesTable; see there for why it lives at module scope.
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

const helper = createColumnHelper<typeof features, PayrollRow>();

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const STATUS_STYLES: Record<PayrollRow["status"], string> = {
  DRAFT: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

// Amounts arrive as exact decimal strings; sort and format them as numbers.
const amountColumn = (key: "grossPay" | "deductions" | "netPay", header: string) =>
  helper.accessor((row) => Number(row[key]), {
    id: key,
    header,
    sortFn: "basic",
    cell: (info) => <span className="font-mono">{money.format(info.getValue())}</span>,
  });

const columns = helper.columns([
  helper.accessor("period", { header: "Period", sortFn: "alphanumeric" }),
  helper.accessor((row) => row.employee?.employeeNo ?? "—", {
    id: "employeeNo",
    header: "No.",
    sortFn: "alphanumeric",
  }),
  helper.accessor((row) => row.employee?.fullName ?? "Unknown (not in HR)", {
    id: "employee",
    header: "Employee",
    sortFn: "alphanumeric",
  }),
  helper.accessor((row) => row.employee?.departmentName ?? "—", {
    id: "department",
    header: "Department",
    sortFn: "alphanumeric",
  }),
  amountColumn("grossPay", "Gross"),
  amountColumn("deductions", "Deductions"),
  amountColumn("netPay", "Net"),
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
]);

export function PayrollTable({ data }: { data: PayrollRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "period", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");

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
        <span className="sr-only">Search payroll</span>
        <input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search payroll…"
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
                    <th
                      key={header.id}
                      scope="col"
                      className="px-4 py-3 font-medium"
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                      }
                    >
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
                  {globalFilter ? "No entries match your search." : "No payroll entries yet."}
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
    </div>
  );
}
