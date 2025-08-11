"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ProductForStock, ProductStockDetail, WarehouseForFilter } from "../types";

// --- Modal for delete confirmation ---
function ConfirmModal({ open, title, message, onConfirm, onCancel }: {
  open: boolean,
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel: () => void,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gray-900 bg-opacity-10 pointer-events-none" />
      <div className="relative bg-white rounded-lg shadow-lg p-6 min-w-[320px] z-50">
        <h2 className="font-bold text-lg mb-2">{title}</h2>
        <p className="mb-6 text-gray-700">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

interface OverviewProps {
  products: ProductForStock[];
  stockDetails: ProductStockDetail[];
  warehouses: WarehouseForFilter[];
  page: number;
  itemsPerPage: number;
  showPagination: boolean;
  searchText: string;
  setSearchText: (v: string) => void;
  onStockChanged?: () => void; // Added for parent refresh
}

export default function StockOverviewClient({
  products,
  stockDetails,
  warehouses,
  page,
  itemsPerPage,
  searchText,
  setSearchText,
  onStockChanged,
}: OverviewProps) {
  // Local filter state for warehouse (defaults to "all")
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState("all");

  // --- Modal State ---
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- Local products state so we can update UI after deletion ---
  const [localProducts, setLocalProducts] = useState(products);

  // Update localProducts when parent products change (pagination, etc.)
  React.useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  // Map: productId -> array of stock details for that product
  const stockMap = useMemo(() => {
    const map: Record<string, ProductStockDetail[]> = {};
    stockDetails.forEach((s) => {
      if (!map[s.product_id]) {
        map[s.product_id] = [];
      }
      map[s.product_id].push(s);
    });
    return map;
  }, [stockDetails]);

  // Apply warehouse filter client-side
  const filteredByWarehouse = useMemo(() => {
    if (selectedWarehouseFilter !== "all") {
      return localProducts.filter((p) =>
        stockMap[p.id]?.some(
          (sd) => sd.warehouse_id === selectedWarehouseFilter && sd.quantity > 0
        )
      );
    }
    return localProducts;
  }, [localProducts, selectedWarehouseFilter, stockMap]);

  // Apply search filter client-side
  const filteredProducts = useMemo(() => {
    let arr = filteredByWarehouse;
    if (searchText.trim()) {
      const lower = searchText.trim().toLowerCase();
      arr = arr.filter((p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.unique_reference ?? "").toLowerCase().includes(lower)
      );
    }
    return arr;
  }, [filteredByWarehouse, searchText]);

  // Is any filter active? (search OR warehouse)
  const isFiltering = selectedWarehouseFilter !== "all" || !!searchText.trim();

  // Select which products to show: filtered (all) if filtering, paginated if not
  const productsToShow = useMemo(() => {
    if (isFiltering) {
      return filteredProducts; // show all filtered, ignore pagination
    } else {
      // Show paginated slice
      const startIdx = (page - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      return localProducts.slice(startIdx, endIdx);
    }
  }, [isFiltering, filteredProducts, localProducts, page, itemsPerPage]);

  const getStockStatusClass = (productId: string, threshold: number) => {
    const totalStock = (stockMap[productId] || []).reduce((sum: number, s) => sum + s.quantity, 0);
    if (totalStock === 0) return "text-red-500";
    if (totalStock <= threshold) return "text-yellow-500";
    return "text-green-500";
  };

  const getTotalProductStock = (productId: string) => {
    return (stockMap[productId] || []).reduce((sum: number, s) => sum + s.quantity, 0);
  };

  const getWarehouseStockDisplay = (productId: string) => {
    const stocks = stockMap[productId] || [];
    if (!stocks.length) return "N/A";
    return (
      <div className="space-y-1">
        {stocks
          .filter((sd) => sd.quantity > 0)
          .map((sd) => (
            <div key={sd.warehouse_id} className="flex justify-between items-center">
              <span>{sd.warehouses?.name || "Unknown Warehouse"}:</span>
              <span className="font-bold">{sd.quantity}</span>
            </div>
          ))}
      </div>
    );
  };

  // --- Delete handler: open modal ---
  const handleDelete = (productId: string) => {
    setDeleteProductId(productId);
    setDeleteModalOpen(true);
    setErrorMsg("");
    setSuccessMsg("");
  };

  // --- Modal actions ---
  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setDeleteProductId(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProductId) return;
    setDeleting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // --- Supabase call to delete product ---
      const { createClient } = await import("@/lib/supabase/client"); // Adjust import to your client
      const supabase = createClient();

      // Delete from stock table, not products table
      const { error } = await supabase
        .from("stock")
        .delete()
        .eq("product_id", deleteProductId);

      if (error) {
        setErrorMsg(error.message || "Failed to delete stock.");
      } else {
        setLocalProducts((prev) => prev.filter((p) => p.id !== deleteProductId));
        setSuccessMsg("Stock record deleted successfully.");
        setDeleteModalOpen(false);
        setDeleteProductId(null);
        if (onStockChanged) onStockChanged();
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Filter Section --- */}
      <section className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full sm:w-[260px]"
            placeholder="Search products by name or reference..."
          />
          <Select
            onValueChange={v => setSelectedWarehouseFilter(v)}
            value={selectedWarehouseFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map(warehouse => (
                <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* --- Stock Overview Table Section --- */}
      <Card className="overflow-x-auto p-6">
        <CardHeader>
          <CardTitle>Current Stock Levels</CardTitle>
          <CardDescription>
            Overview of product quantities across all warehouses.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="w-full">
            <Table className="min-w-[800px] w-full table-auto rounded-md overflow-hidden">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[5%]">SN</TableHead>
                  <TableHead className="w-[26%]">Product/Reference</TableHead>
                  <TableHead className="w-[22%]">Warehouses</TableHead>
                  <TableHead className="w-[7%] text-center">Unit</TableHead>
                  <TableHead className="w-[10%] text-center">Total Stock</TableHead>
                  <TableHead className="w-[10%] text-center">Threshold</TableHead>
                  <TableHead className="w-[10%] text-center">Status</TableHead>
                  <TableHead className="w-[10%] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsToShow.length > 0 ? (
                  productsToShow.map((product, idx) => {
                    const totalStock = getTotalProductStock(product.id);
                    const stockStatusClass = getStockStatusClass(
                      product.id,
                      product.low_stock_threshold
                    );
                    const SN = isFiltering
                      ? idx + 1
                      : (page - 1) * itemsPerPage + idx + 1;
                    return (
                      <TableRow
                        key={product.id}
                        className="hover:bg-gray-100 transition-colors"
                      >
                        <TableCell>
                          {SN}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="block">{product.name}</span>
                          <span className="text-xs text-gray-500">
                            ({product.unique_reference})
                          </span>
                        </TableCell>
                        <TableCell>{getWarehouseStockDisplay(product.id)}</TableCell>
                        <TableCell className="text-center">
                          {product.product_unit_abbreviation || "N/A"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-center font-extrabold text-lg",
                            stockStatusClass
                          )}
                        >
                          {totalStock}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.low_stock_threshold}
                        </TableCell>
                        <TableCell
                          className={cn("text-center font-bold", stockStatusClass)}
                        >
                          {totalStock === 0
                            ? "Out of Stock"
                            : totalStock <= product.low_stock_threshold
                            ? "Low Stock"
                            : "In Stock"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Delete"
                            onClick={() => handleDelete(product.id)}
                            className="hover:bg-red-100"
                            disabled={deleting}
                          >
                            <Trash2 className="h-5 w-5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                      No products found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- Confirm Delete Modal --- */}
      <ConfirmModal
        open={deleteModalOpen}
        title="Delete Stock"
        message="Are you sure you want to delete this stock record? This action cannot be undone."
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
      {errorMsg ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded shadow z-50">
          {errorMsg}
        </div>
      ) : null}
      {successMsg ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded shadow z-50">
          {successMsg}
        </div>
      ) : null}
    </div>
  );
}    