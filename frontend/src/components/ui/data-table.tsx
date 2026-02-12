'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive';
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowActions?: RowAction<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  columnId: string | null;
  direction: SortDirection;
}

// ── Component ──────────────────────────────────────────

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  rowActions,
  searchPlaceholder = 'Buscar...',
  searchKey,
  loading = false,
  emptyMessage = 'No se encontraron resultados.',
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<SortState>({ columnId: null, direction: null });
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // Filter
  const filteredData = React.useMemo(() => {
    if (!search || !searchKey) return data;
    const term = search.toLowerCase();
    return data.filter((row) => {
      const value = row[searchKey];
      return String(value ?? '').toLowerCase().includes(term);
    });
  }, [data, search, searchKey]);

  // Sort
  const sortedData = React.useMemo(() => {
    if (!sort.columnId || !sort.direction) return filteredData;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = col.accessorKey ? a[col.accessorKey] : null;
      const bVal = col.accessorKey ? b[col.accessorKey] : null;
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');

      const comparison = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sort, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [search, pageSize]);

  function handleSort(columnId: string) {
    setSort((prev) => {
      if (prev.columnId !== columnId) return { columnId, direction: 'asc' };
      if (prev.direction === 'asc') return { columnId, direction: 'desc' };
      return { columnId: null, direction: null };
    });
  }

  function getCellValue(row: T, col: ColumnDef<T>): React.ReactNode {
    if (col.accessorFn) return col.accessorFn(row);
    if (col.accessorKey) {
      const val = row[col.accessorKey];
      if (val === null || val === undefined) return '-';
      return String(val);
    }
    return '-';
  }

  function SortIcon({ columnId }: { columnId: string }) {
    if (sort.columnId !== columnId) return <ArrowUpDown className="size-3.5" />;
    if (sort.direction === 'asc') return <ArrowUp className="size-3.5" />;
    return <ArrowDown className="size-3.5" />;
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {searchKey && <Skeleton className="h-9 w-64" />}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.id}>{col.header}</TableHead>
                ))}
                {rowActions && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchKey && (
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                      onClick={() => handleSort(col.id)}
                    >
                      {col.header}
                      <SortIcon columnId={col.id} />
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
              {rowActions && rowActions.length > 0 && (
                <TableHead className="w-12" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={(row as { id?: string }).id ?? rowIndex}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {getCellValue(row, col)}
                    </TableCell>
                  ))}
                  {rowActions && rowActions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions.map((action) => (
                            <DropdownMenuItem
                              key={action.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(row);
                              }}
                              className={
                                action.variant === 'destructive'
                                  ? 'text-destructive focus:text-destructive'
                                  : undefined
                              }
                            >
                              {action.icon}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {sortedData.length > pageSizeOptions[0] && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>Filas por pagina</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => setPageSize(Number(val))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              Pagina {currentPage + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
