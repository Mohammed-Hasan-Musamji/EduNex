import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Dense table on tablet/desktop; on phones each row becomes a stacked
 * label/value card instead of a horizontally scrolling table.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  emptyMessage = "No records found.",
  page,
  pageCount,
  onPageChange,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing here yet" description={emptyMessage} />;
  }

  return (
<<<<<<< HEAD
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
=======
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-sm">
      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <li key={getRowId(row)} className="flex flex-col gap-2 p-4">
            {columns.map((column) => (
              <div key={column.key} className="flex items-start justify-between gap-3 text-sm">
                <span className="shrink-0 text-xs font-medium text-text-subtle">{column.header}</span>
                <span className="min-w-0 text-right text-text">{column.render(row)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
>>>>>>> b5abe61 (Implemented 3)
          <thead>
            <tr className="border-b border-border bg-surface-2/60">
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowId(row)} className="border-b border-border transition-colors last:border-0 hover:bg-ivory">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-middle text-text">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount !== undefined && pageCount > 1 && page !== undefined && onPageChange && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-text-muted">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
              className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-ivory disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
              className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-ivory disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
