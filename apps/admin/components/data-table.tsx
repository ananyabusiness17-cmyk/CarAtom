'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useState } from 'react';

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  getRowId?: (row: T) => string;
  highlightRow?: (row: T) => boolean;
};

export function DataTable<T>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = 'No rows.',
  getRowId,
  highlightRow,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-subtle text-muted">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="h-11 px-3 font-medium">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className={header.column.getCanSort() ? 'inline-flex items-center gap-1' : undefined}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-t border-border">
                <td className="h-11 px-3" colSpan={columns.length}>
                  <span className="block h-3 w-2/5 animate-pulse rounded bg-subtle" />
                </td>
              </tr>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td className="h-16 px-3 text-muted" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`h-11 border-t border-border ${highlightRow?.(row.original) ? 'bg-warning-soft/60' : ''} ${
                  onRowClick ? 'cursor-pointer hover:bg-brand-soft/60' : ''
                }`}
                onClick={() => onRowClick?.(row.original)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(event) => {
                  if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onRowClick(row.original);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
