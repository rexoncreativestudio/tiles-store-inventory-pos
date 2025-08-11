"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Pagination from "@/components/ui/pagination";

interface PaginationWrapperProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}

export default function PaginationWrapper({
  totalItems,
  itemsPerPage,
  currentPage,
}: PaginationWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString()); 
    params.set("page", String(newPage));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Pagination
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      currentPage={currentPage}
      onPageChange={onPageChange}
    />
  );
}