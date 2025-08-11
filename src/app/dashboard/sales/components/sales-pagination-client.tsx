"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Pagination from "@/components/ui/pagination";

type SalesPaginationClientProps = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
};

export default function SalesPaginationClient({
  totalItems,
  itemsPerPage,
  currentPage,
}: SalesPaginationClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleItemsPerPageChange(newItemsPerPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("itemsPerPage", String(newItemsPerPage));
    params.set("page", "1"); // Reset to first page
    router.replace(`${pathname}?${params.toString()}`);
  }
 
  return (
    <Pagination
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      currentPage={currentPage}
      onPageChange={handlePageChange}
      onItemsPerPageChange={handleItemsPerPageChange}
    />
  );
}