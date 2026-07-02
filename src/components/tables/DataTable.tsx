import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  pageSize?: number
  manualPagination?: boolean
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  pageCount?: number
  totalElements?: number
  getRowClassName?: (row: TData) => string
  onRowClick?: (row: TData) => void
  emptyMessage?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pageSize = 10,
  manualPagination = false,
  pagination,
  onPaginationChange,
  pageCount,
  totalElements,
  getRowClassName,
  onRowClick,
  emptyMessage = 'No se encontraron resultados.',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })

  const paginationState = manualPagination ? pagination ?? internalPagination : internalPagination

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(paginationState) : updater
      if (manualPagination) {
        onPaginationChange?.(next)
      } else {
        setInternalPagination(next)
      }
    },
    state: { sorting, columnFilters, pagination: paginationState },
  })

  const totalLabel = manualPagination && totalElements !== undefined
    ? totalElements
    : table.getFilteredRowModel().rows.length

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border bg-card custom-scrollbar">
        <Table>
          <TableHeader className="bg-[var(--muted)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-[var(--muted)]">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-3 py-[10px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--imss-ink-500)] whitespace-nowrap sm:px-4"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={[
                    'hover:bg-[var(--imss-green-50)] data-[state=selected]:bg-[var(--imss-green-50)] data-[state=selected]:shadow-[inset_2px_0_0_var(--primary)]',
                    onRowClick ? 'cursor-pointer' : '',
                    getRowClassName?.(row.original) ?? '',
                  ].join(' ')}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-3 tabular-nums sm:px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-mono text-muted-foreground text-center sm:text-left">
          {totalLabel} registro(s)
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap px-1">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button variant="ghost" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  )
}
