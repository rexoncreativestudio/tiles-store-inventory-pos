"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Eye, Pencil, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";

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

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'default';
    case 'pending': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

export default function PurchaseOverviewClient({
  initialPurchases,
  initialWarehouses,
}: PurchaseOverviewClientProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const router = useRouter();

  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState("");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecordForDisplay | null>(null);

  const filteredAndSearchedPurchases = useMemo(() => {
    let purchasesToDisplay = initialPurchases;

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
  }, [initialPurchases, selectedWarehouseFilter, dateRange, purchaseSearchQuery]);

  const handleViewDetails = (purchase: PurchaseRecordForDisplay) => {
    setSelectedPurchase(purchase);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditPurchase = (purchase: PurchaseRecordForDisplay) => {
    router.push(`/dashboard/purchases?edit=${purchase.id}`);
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle>Purchase Records</CardTitle>
        <CardDescription>Filter and search all recorded inventory purchases.</CardDescription>
      </CardHeader>

      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="flex-grow relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            {initialWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? `${format(dateRange.from, "LLL d, y")} - ${format(dateRange.to, "LLL d, y")}` : format(dateRange.from, "LLL d, y")
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
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">SN</TableHead>
              <TableHead className="w-[80px]">Date</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px] text-center">Items</TableHead>
              <TableHead className="w-[150px] text-right">Total Cost</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSearchedPurchases.length > 0 ? (
              filteredAndSearchedPurchases.map((purchase, index) => (
                <TableRow key={purchase.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{format(parseISO(purchase.purchase_date), "MMM d, y")}</TableCell>
                  <TableCell>{purchase.warehouses?.name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(purchase.status)} className="capitalize">{purchase.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{purchase.purchase_items.length}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(purchase.total_cost)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex space-x-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(purchase)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditPurchase(purchase)} title="Edit Purchase">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No purchases found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
            <DialogDescription>
                A detailed summary of the purchase made on {selectedPurchase ? format(parseISO(selectedPurchase.purchase_date), "PPP") : ''}.
            </DialogDescription>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-3 gap-4">
                  <div><strong>Date:</strong> {format(parseISO(selectedPurchase.purchase_date), "PPP")}</div>
                  <div><strong>Warehouse:</strong> {selectedPurchase.warehouses?.name || "N/A"}</div>
                  <div><strong>Status:</strong> <Badge variant={getStatusVariant(selectedPurchase.status)} className="capitalize">{selectedPurchase.status}</Badge></div>
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
                      <TableCell>{item.products?.name || "N/A"}</TableCell>
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
            <Button variant="outline" onClick={() => setIsViewDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}