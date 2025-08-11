"use client";
import React, { useState } from "react";
import StockOverviewClient from "./stock-overview-client";
import Pagination from "@/components/ui/pagination";
import type {
  ProductForStock,
  ProductStockDetail,
  WarehouseForFilter,
} from "../types";

interface Props {
  products: ProductForStock[];      // paginated products (can remove if not needed)
  allProducts: ProductForStock[];   // ALL products (always use for filtering)
  stockDetails: ProductStockDetail[];
  warehouses: WarehouseForFilter[];
  totalProductsCount: number;
  initialPage: number;
  initialItemsPerPage: number;
}

export default function StockManagementClient({
  allProducts,
  stockDetails,
  warehouses,
  totalProductsCount,
  initialPage,
  initialItemsPerPage,
}: Props) {
  const [page, setPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [searchText, setSearchText] = useState("");
  const [refreshFlag, setRefreshFlag] = useState(0); // Used to trigger child refresh

  // Callback for stock change (delete)
  const handleStockChanged = () => {
    setRefreshFlag(r => r + 1); // Triggers remount of StockOverviewClient
  };

  return (
    <div>
      <StockOverviewClient
        products={allProducts}                 // always pass ALL products
        stockDetails={stockDetails}
        warehouses={warehouses}
        page={page}
        itemsPerPage={itemsPerPage}
        showPagination={true}
        searchText={searchText}
        setSearchText={setSearchText}
        onStockChanged={handleStockChanged}
        key={refreshFlag} // Force reload on delete
      />
      <div className="flex justify-center">
        <Pagination
          totalItems={totalProductsCount}
          itemsPerPage={itemsPerPage}
          currentPage={page}
          onPageChange={setPage}
          onItemsPerPageChange={setItemsPerPage}  
        />
      </div>
    </div>
  );
}