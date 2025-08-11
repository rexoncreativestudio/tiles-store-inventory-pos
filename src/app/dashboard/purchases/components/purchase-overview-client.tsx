"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Search, Eye, Pencil, CalendarIcon, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import Pagination from "@/components/ui/pagination";
import { toast } from "sonner";

type ProductForPurchaseItem = {
  id: string;
  name: string;
  unique_reference: string;
  product_unit_abbreviation: string | null;
};

type PurchaseItemForDisplay = {
  id: string;
  quantity: number;
  unit_purchase_price: number;
  total_cost: number;
  products: ProductForPurchaseItem | null;
};

type PurchaseRecordForDisplay = {
  id: string;
  purchase_date: string;
  warehouse_id: string | null;
  status: string;
  total_cost: number;
  warehouses: { id: string; name: string } | null;
  purchase_items: PurchaseItemForDisplay[];
};

type WarehouseForFilter = {
  id: string;
  name: string;
};

interface PurchaseOverviewClientProps {
  initialPurchases: PurchaseRecordForDisplay[];
  initialWarehouses: WarehouseForFilter[];
}

function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

export default function PurchaseOverviewClient({
  initialPurchases,
  initialWarehouses,
}: PurchaseOverviewClientProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const router = useRouter();

  // Local state for purchases so we can update after delete
  const [purchases, setPurchases] = useState<PurchaseRecordForDisplay[]>(initialPurchases);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState("");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange());

  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecordForDisplay | null>(null);

  // For delete confirmation modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseRecordForDisplay | null>(null);

  const isFiltered =
    purchaseSearchQuery.trim() !== "" ||
    selectedWarehouseFilter !== "all" ||
    (dateRange && dateRange.from && dateRange.to &&
      (dateRange.from.getTime() !== startOfMonth(new Date()).getTime() ||
        dateRange.to.getTime() !== endOfMonth(new Date()).getTime()));

  const filteredAndSearchedPurchases = useMemo(() => {
    let purchasesToDisplay = purchases;

    if (selectedWarehouseFilter !== "all") {
      purchasesToDisplay = purchasesToDisplay.filter(p => p.warehouse_id === selectedWarehouseFilter);
    }

    if (dateRange?.from && dateRange?.to) {
      purchasesToDisplay = purchasesToDisplay.filter(p =>
        isWithinInterval(parseISO(p.purchase_date), { start: dateRange.from!, end: dateRange.to! })
      );
    }

    if (purchaseSearchQuery) {
      const lowerCaseQuery = purchaseSearchQuery.toLowerCase();
      purchasesToDisplay = purchasesToDisplay.filter(p =>
        p.purchase_items.some(item => item.products?.name.toLowerCase().includes(lowerCaseQuery))
      );
    }

    return purchasesToDisplay;
  }, [purchases, selectedWarehouseFilter, dateRange, purchaseSearchQuery]);

  const displayPurchases = isFiltered
    ? filteredAndSearchedPurchases
    : filteredAndSearchedPurchases.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const handleResetFilters = () => {
    setPurchaseSearchQuery("");
    setSelectedWarehouseFilter("all");
    setDateRange(getDefaultDateRange());
    setCurrentPage(1);
    setItemsPerPage(10);
  };

  const handleViewDetails = (purchase: PurchaseRecordForDisplay) => {
    setSelectedPurchase(purchase);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditPurchase = (purchase: PurchaseRecordForDisplay) => {
    router.push(`/dashboard/purchases?edit=${purchase.id}`);
  };

  // Show confirmation dialog before delete
  const handleDeleteClick = (purchase: PurchaseRecordForDisplay) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  // Actual delete function
  const handleConfirmDelete = async () => {
    if (!purchaseToDelete) return;

    // TODO: Replace with actual API/database delete
    // Example:
    // await supabaseClient.from("purchases").delete().eq("id", purchaseToDelete.id);

    // Remove from local state (optimistic update)
    setPurchases(prev => prev.filter(p => p.id !== purchaseToDelete.id));
    toast.success("Purchase deleted successfully.");

    setDeleteDialogOpen(false);
    setPurchaseToDelete(null);
  };

  const getTotalQuantity = (purchase: PurchaseRecordForDisplay) =>
    purchase.purchase_items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  return (
    <div className="bg-gradient-to-br from-gray-100 via-white to-gray-200 min-h-screen p-0 sm:p-8">
      <section className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-6 px-4 pt-6">
        <div>
          <CardTitle className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
            Purchase Records
          </CardTitle>
          <CardDescription className="text-gray-500">
            Filter and search all recorded inventory purchases.
          </CardDescription>
        </div>
      </section>
      <section className="bg-white rounded-xl shadow-md mb-8 px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-grow relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by product name..."
              className="pl-10 w-full"
              value={purchaseSearchQuery}
              onChange={(e) => setPurchaseSearchQuery(e.target.value)}
            />
          </div>
          <Select onValueChange={setSelectedWarehouseFilter} value={selectedWarehouseFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {initialWarehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to
                    ? `${format(dateRange.from, "LLL d, y")} - ${format(dateRange.to, "LLL d, y")}`
                    : format(dateRange.from, "LLL d, y")
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="secondary"
            onClick={handleResetFilters}
            className="flex items-center gap-2"
            title="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-lg p-0 sm:p-8">
        <div className="overflow-x-auto">
          <Table className="min-w-[850px] w-full table-auto rounded-md overflow-hidden">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[5%]">SN</TableHead>
                <TableHead className="w-[13%]">Date</TableHead>
                <TableHead className="w-[17%]">Warehouse</TableHead>
                <TableHead className="w-[13%]">Quantity</TableHead>
                <TableHead className="w-[10%] text-center">Items</TableHead>
                <TableHead className="w-[15%] text-right">Total Cost</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPurchases.length > 0 ? (
                displayPurchases.map((purchase, index) => (
                  <TableRow key={purchase.id} className="hover:bg-gray-100 transition-colors">
                    <TableCell>
                      {isFiltered
                        ? index + 1
                        : (currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(purchase.purchase_date), "MMM d, y")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {purchase.warehouses?.name || "N/A"}
                    </TableCell>
                    <TableCell>
                      {getTotalQuantity(purchase)}
                    </TableCell>
                    <TableCell className="text-center">
                      {purchase.purchase_items.length > 0 ? (
                        <div className="flex flex-col items-start">
                          {purchase.purchase_items.map((item) => (
                            <span key={item.id} className="truncate">
                              {item.products
                                ? `${item.products.name} (${item.products.unique_reference})`
                                : "N/A"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No items</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-lg">
                      {formatCurrency(purchase.total_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex space-x-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(purchase)}
                          title="View Details"
                          className="hover:bg-blue-50 group"
                        >
                          <Eye className="h-5 w-5 text-blue-600 group-hover:text-blue-800" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPurchase(purchase)}
                          title="Edit Purchase"
                          className="hover:bg-yellow-50 group"
                        >
                          <Pencil className="h-5 w-5 text-yellow-600 group-hover:text-yellow-800" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(purchase)}
                          title="Delete Purchase"
                          className="hover:bg-red-50 group"
                        >
                          <Trash2 className="h-5 w-5 text-red-600 group-hover:text-red-800" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No purchases found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!isFiltered && (
          <div className="flex justify-center mt-6">
            <Pagination
              totalItems={filteredAndSearchedPurchases.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(v) => {
                setItemsPerPage(v);
                setCurrentPage(1);
              }}
              siblingCount={1}
            />
          </div>
        )}
      </section>

      {/* Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
            <DialogDescription>
              A detailed summary of the purchase made on {selectedPurchase ? format(parseISO(selectedPurchase.purchase_date), "PPP") : ''}.
            </DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <strong>Date:</strong> {format(parseISO(selectedPurchase.purchase_date), "PPP")}
                </div>
                <div>
                  <strong>Warehouse:</strong> {selectedPurchase.warehouses?.name || "N/A"}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPurchase.purchase_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.products
                          ? `${item.products.name} (${item.products.unique_reference})`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_purchase_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end pt-4">
                <div className="text-right">
                  <div className="text-muted-foreground">Total Cost</div>
                  <div className="text-xl font-bold">{formatCurrency(selectedPurchase.total_cost)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete Purchase
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> 
    </div>
  );
}