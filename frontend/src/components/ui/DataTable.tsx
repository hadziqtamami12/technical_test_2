'use client';

import React, { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  id?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  cell?: (row: T, index: number) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  showNumbering?: boolean;
  numberingHeader?: string;
  searchPlaceholder?: string;
  enableGlobalSearch?: boolean;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  // Optional server-side control:
  serverSide?: {
    totalRecords: number;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onSortChange?: (key: string, direction: SortDirection) => void;
  };
}

/**
 * Enterprise SaaS DataTable with automatic numbering, column sorting, pagination, and clean light UI.
 */
export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Tidak ada data ditemukan.',
  showNumbering = true,
  numberingHeader = '#',
  searchPlaceholder = 'Cari data di tabel...',
  enableGlobalSearch = true,
  pageSizeOptions = [5, 10, 25, 50],
  initialPageSize = 10,
  serverSide,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(initialPageSize);

  const isServerSide = !!serverSide;
  const currentPage = isServerSide ? serverSide.currentPage : clientPage;
  const pageSize = isServerSide ? serverSide.pageSize : clientPageSize;

  const handleSort = (column: ColumnDef<T>) => {
    if (!column.sortable) return;
    const key = (column.id || column.accessorKey) as string;
    if (!key) return;

    let nextDirection: SortDirection = 'asc';
    if (sortKey === key) {
      if (sortDirection === 'asc') nextDirection = 'desc';
      else if (sortDirection === 'desc') nextDirection = null;
      else nextDirection = 'asc';
    }

    setSortKey(nextDirection ? key : null);
    setSortDirection(nextDirection);

    if (isServerSide && serverSide.onSortChange) {
      serverSide.onSortChange(key, nextDirection);
    }
  };

  const processedData = useMemo(() => {
    if (isServerSide) return data;

    let result = [...data];

    // Global client search
    if (enableGlobalSearch && searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter((item) => {
        return columns.some((col) => {
          if (col.accessorKey) {
            const val = item[col.accessorKey];
            if (val !== null && val !== undefined) {
              return String(val).toLowerCase().includes(query);
            }
          }
          return false;
        });
      });
    }

    // Client sorting
    if (sortKey && sortDirection) {
      const activeCol = columns.find((c) => (c.id || c.accessorKey) === sortKey);
      result.sort((a, b) => {
        let valA: unknown = null;
        let valB: unknown = null;

        if (activeCol?.sortValue) {
          valA = activeCol.sortValue(a);
          valB = activeCol.sortValue(b);
        } else if (activeCol?.accessorKey) {
          valA = a[activeCol.accessorKey];
          valB = b[activeCol.accessorKey];
        }

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        return sortDirection === 'asc' ? comp : -comp;
      });
    }

    return result;
  }, [data, isServerSide, enableGlobalSearch, searchTerm, columns, sortKey, sortDirection]);

  const totalRecords = isServerSide ? serverSide.totalRecords : processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const paginatedData = useMemo(() => {
    if (isServerSide) return processedData;
    const start = (clientPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, isServerSide, clientPage, pageSize]);

  const setPage = (page: number) => {
    const target = Math.max(1, Math.min(page, totalPages));
    if (isServerSide) {
      serverSide.onPageChange(target);
    } else {
      setClientPage(target);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isServerSide && serverSide.onPageSizeChange) {
      serverSide.onPageSizeChange(newSize);
    } else {
      setClientPageSize(newSize);
      setClientPage(1);
    }
  };

  const startIndex = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRecords);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Filter and Page Size Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
        {enableGlobalSearch && !isServerSide && (
          <div className="relative w-full sm:w-80">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setClientPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>
        )}

        <div className="flex items-center justify-between w-full sm:w-auto gap-4 ml-auto text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>baris</span>
          </div>

          <div className="font-medium text-slate-700 whitespace-nowrap">
            Total: <span className="font-semibold text-slate-900">{totalRecords}</span> entri
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {showNumbering && (
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-14">
                  {numberingHeader}
                </th>
              )}

              {columns.map((column, idx) => {
                const key = (column.id || column.accessorKey) as string;
                const isSorted = sortKey === key;
                const alignClass =
                  column.align === 'right'
                    ? 'text-right'
                    : column.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={key || idx}
                    onClick={() => handleSort(column)}
                    className={`px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none ${alignClass} ${
                      column.sortable ? 'cursor-pointer hover:bg-slate-100/70 transition-colors' : ''
                    } ${column.className || ''}`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${column.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      <span>{column.header}</span>
                      {column.sortable && (
                        <span className="flex flex-col text-[9px] leading-[8px] text-slate-400">
                          <span className={isSorted && sortDirection === 'asc' ? 'text-slate-900 font-bold' : ''}>
                            ▲
                          </span>
                          <span className={isSorted && sortDirection === 'desc' ? 'text-slate-900 font-bold' : ''}>
                            ▼
                          </span>
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (showNumbering ? 1 : 0)}
                  className="px-6 py-12 text-center text-slate-400 text-xs"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
                    <span>Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showNumbering ? 1 : 0)}
                  className="px-6 py-12 text-center text-slate-400 text-xs"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowNumber = (currentPage - 1) * pageSize + index + 1;
                return (
                  <tr
                    key={keyExtractor(row)}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {showNumbering && (
                      <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs text-slate-500">
                        {rowNumber}
                      </td>
                    )}

                    {columns.map((column, colIdx) => {
                      const alignClass =
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      return (
                        <td
                          key={colIdx}
                          className={`px-4 py-3.5 ${alignClass} ${column.className || ''}`}
                        >
                          {column.cell
                            ? column.cell(row, index)
                            : column.accessorKey
                            ? String(row[column.accessorKey] ?? '-')
                            : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Menampilkan <span className="font-semibold text-slate-900">{startIndex}</span> sampai{' '}
          <span className="font-semibold text-slate-900">{endIndex}</span> dari{' '}
          <span className="font-semibold text-slate-900">{totalRecords}</span> data
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setPage(currentPage - 1)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
          >
            Sebelumnya
          </button>

          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((num, i) =>
              num === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1 text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${num}`}
                  type="button"
                  onClick={() => setPage(Number(num))}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    currentPage === num
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {num}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setPage(currentPage + 1)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}

