"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/ui/pagination";

interface PurchasePaginationClientProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}

export default function PurchasePaginationClient({
  totalItems,
  itemsPerPage,
  currentPage,
}: PurchasePaginationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set(key, String(value));
    // Always reset to page 1 if itemsPerPage changes
    if (key === "itemsPerPage") {
      params.set("page", "1");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <Pagination
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      currentPage={currentPage}
      onPageChange={(page) => setParam("page", page)}
      onItemsPerPageChange={(perPage) => setParam("itemsPerPage", perPage)}
    />
  );
}