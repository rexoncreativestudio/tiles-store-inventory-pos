"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WarehouseForController, StockReviewRow } from "../types";
import { WarehouseIcon, Search, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // Make sure you've installed jspdf-autotable

type StockReviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseForController[];
  stockData: StockReviewRow[];
};

export default function StockReviewModal({
  open,
  onOpenChange,
  warehouses,
  stockData,
}: StockReviewModalProps) {
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [searchRef, setSearchRef] = useState("");

  // Filtered data
  const filteredRows = useMemo(() => {
    return stockData
      .filter((row) =>
        warehouseFilter === "all"
          ? true
          : row.warehouses.some((w) => w.warehouse_id === warehouseFilter)
      )
      .filter((row) =>
        searchRef
          ? row.product_ref.toLowerCase().includes(searchRef.toLowerCase())
          : true
      );
  }, [stockData, warehouseFilter, searchRef]);

  // PDF Download Handler
  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Stock Review Report", 105, 16, { align: "center" });

    const headers = [
      ["SN", "Product Name / Ref", "Warehouses / Stock", "Total Stock"]
    ];
    const rows = filteredRows.map((row, idx) => [
      idx + 1,
      `${row.product_name}\nRef: ${row.product_ref}`,
      row.warehouses.map(w => `${w.warehouse_name}: ${w.quantity}`).join(", "),
      row.total_stock
    ]);

    (autoTable as any)(doc, {
      head: headers,
      body: rows,
      startY: 28,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10, cellPadding: 2 },
    });

    doc.save("Stock_Review.pdf");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0">
        <DialogHeader>
          <DialogTitle>
            Stock Review
          </DialogTitle>
        </DialogHeader>
        {/* Header/Filters */}
        <div className="p-4 bg-white border-b flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch">
          <div className="flex-1 flex gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by product reference..."
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Button
              variant="outline"
              className="flex-shrink-0"
              onClick={handleDownloadPDF}
              title="Download PDF"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="w-full sm:w-56">
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <div className="flex items-center gap-2">
                      <WarehouseIcon className="h-4 w-4" />
                      {w.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-left font-semibold w-12">SN</th>
                <th className="py-3 px-4 text-left font-semibold">Product</th>
                <th className="py-3 px-4 text-left font-semibold">Warehouses</th>
                <th className="py-3 px-4 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No products found.
                  </td>
                </tr>
              )}
              {filteredRows.map((row, idx) => (
                <tr key={row.product_id} className="border-b last:border-none hover:bg-gray-100">
                  <td className="py-2 px-4 font-semibold text-center">{idx + 1}</td>
                  <td className="py-2 px-4">
                    <div className="font-medium">{row.product_name}</div>
                    <div className="text-xs text-gray-500">Ref: {row.product_ref}</div>
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex flex-wrap gap-2">
                      {row.warehouses.map((w) => (
                        <span
                          key={w.warehouse_id}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-900 rounded text-xs font-semibold border"
                        >
                          {w.warehouse_name}: {w.quantity}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right font-bold">{row.total_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Close */}
        <div className="p-4 border-t bg-white flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 