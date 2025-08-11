// src/components/ui/pagination.tsx
"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
// import { cn } from '@/lib/utils'; // Removed unused cn, uncomment if needed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  siblingCount?: number; // How many page numbers to show on either side of the current page
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  siblingCount = 1,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Memoized array of page numbers to display
  const paginationRange = useMemo(() => {
    const totalPageNumbers = siblingCount * 2 + 3; // 2 siblings + current + first + last + 2 dots

    // Case 1: Total pages less than or equal to totalPageNumbers, show all
    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2; // If left sibling is far from page 1
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1; // If right sibling is far from last page

    // Case 2: No left dots, but right dots
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemsCount = 3 + 2 * siblingCount; // 1, 2, 3, ..., N
      return [...Array.from({ length: leftItemsCount }, (_, i) => i + 1), '...', totalPages];
    }

    // Case 3: Left dots, but no right dots
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemsCount = 3 + 2 * siblingCount; // ..., N-2, N-1, N
      return [1, '...', ...Array.from({ length: rightItemsCount }, (_, i) => totalPages - rightItemsCount + 1 + i)];
    }

    // Case 4: Both left and right dots
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [1, '...', ...middleRange, '...', totalPages];
    }

    return []; // Fallback, should not happen
  }, [totalPages, siblingCount, currentPage]); // Remove 'totalItems' from dependency array

  const startIndex = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-2 py-3 sm:px-6 flex-wrap gap-2">
      {/* Items count display with per-page dropdown */}
      <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Showing</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={(v) => onItemsPerPageChange?.(Number(v))}
        >
          <SelectTrigger className="w-[70px] h-7 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEMS_PER_PAGE_OPTIONS.map(opt => (
              <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>
          {startIndex} to {endIndex} of {totalItems} entries
        </span>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="flex space-x-1">
          {paginationRange.map((page, index) => {
            if (page === '...') {
              return <span key={`dots-${index}`} className="px-2 py-1 text-sm">...</span>;
            }
            return (
              <Button
                key={`page-${page}-${index}`}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(Number(page))}
                disabled={currentPage === page}
              >
                {page}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}   