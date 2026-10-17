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
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-ivory">
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 font-medium text-text-muted">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowId(row)} className="border-b border-border last:border-0 hover:bg-ivory/60">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-text">
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
              className="flex size-8 items-center justify-center rounded-md border border-border disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
              className="flex size-8 items-center justify-center rounded-md border border-border disabled:opacity-40"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
