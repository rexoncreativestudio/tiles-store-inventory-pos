// src/app/dashboard/reports/stock-purchase-report-table.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrencyFormatter } from '@/lib/formatters';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"; // NEW: For product combobox
import { Check, ChevronsUpDown } from 'lucide-react'; // NEW: For combobox icons


// Define types for data (consistent with page.tsx)
type PurchaseDataForReport = {
    id: string;
    purchase_date: string;
    warehouse_id: string;
    total_cost: number;
    registered_by_user_id: string | null;
    created_at: string;
    updated_at: string;
    warehouses: { id: string; name: string; } | null;
    users: { id: string; email: string; } | null;
    purchase_items: Array<{
      id: string; product_id: string; quantity: number; unit_purchase_price: number;
      total_cost: number;
      products: { id: string; name: string; unique_reference: string; units: { abbreviation: string } | null; } | null;
    }>;
};

type BranchForSelect = {
  id: string;
  name: string;
};

type UserForSelect = {
  id: string;
  email: string;
};

type ProductForSelect = {
  id: string;
  name: string;
  unique_reference: string;
};

type WarehouseForSelect = {
  id: string;
  name: string;
};

type CategoryForSelect = {
  id: string;
  name: string;
};

interface StockPurchaseReportTableProps {
    allPurchasesData: PurchaseDataForReport[];
    allBranches: BranchForSelect[]; // Passed for potential future filters (e.g., branch-specific purchases)
    allUsers: UserForSelect[]; // For filter by registered user
    allProducts: ProductForSelect[]; // For filter by product
    allWarehouses: WarehouseForSelect[]; // For filter by warehouse
    allCategories: CategoryForSelect[]; // Corrected: Added allCategories prop
}

export default function StockPurchaseReportTable({ allPurchasesData, allUsers, allProducts, allWarehouses }: StockPurchaseReportTableProps) {
    const { formatCurrency } = useCurrencyFormatter();
 

    // Filter states
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<string>('all'); // Registered By User
    const [searchRef, setSearchRef] = useState<string>(''); // For purchase ID/ref search
    const [selectedProduct, setSelectedProduct] = useState<string>('all'); // For product filter
    const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false); // For product combobox

    // State for View Details Modal (optional, can be implemented similar to Sales)
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [selectedPurchaseForDetails, setSelectedPurchaseForDetails] = useState<PurchaseDataForReport | null>(null);


    // Filter purchase data based on state
    const filteredPurchasesData = useMemo(() => {
        let filtered = allPurchasesData;

        if (dateFrom) {
            filtered = filtered.filter(purchase => new Date(purchase.purchase_date) >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter(purchase => new Date(purchase.purchase_date) <= dateTo);
        }
        if (selectedWarehouse !== 'all') {
            filtered = filtered.filter(purchase => purchase.warehouse_id === selectedWarehouse);
        }
        if (selectedUser !== 'all') {
            filtered = filtered.filter(purchase => purchase.registered_by_user_id === selectedUser);
        }
        if (selectedProduct !== 'all') { // NEW: Filter by selected product
            filtered = filtered.filter(purchase => purchase.purchase_items.some(item => item.product_id === selectedProduct));
        }
        if (searchRef) {
            filtered = filtered.filter(purchase => purchase.id.toLowerCase().includes(searchRef.toLowerCase()));
        }

        return filtered;
    }, [allPurchasesData, dateFrom, dateTo, selectedWarehouse, selectedUser, selectedProduct, searchRef]);


    const handleResetFilters = () => {
        setDateFrom(undefined);
        setDateTo(undefined);
        setSelectedWarehouse('all');
        setSelectedUser('all');
        setSearchRef('');
        setSelectedProduct('all'); // Reset product filter
        setIsProductComboboxOpen(false);
    };

    const handleViewDetails = (purchase: PurchaseDataForReport) => {
        setSelectedPurchaseForDetails(purchase);
        setIsDetailsDialogOpen(true);
    };

    const selectedProductDisplayName = allProducts.find(p => p.id === selectedProduct)?.name || "All Products";


    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
                {/* Date From */}
                <div className="grid gap-1">
                    <Label htmlFor="purchase_date_from">Date From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !dateFrom && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dateFrom}
                                onSelect={setDateFrom}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                {/* Date To */}
                <div className="grid gap-1">
                    <Label htmlFor="purchase_date_to">Date To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !dateTo && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dateTo}
                                onSelect={setDateTo}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                {/* Warehouse Filter */}
                <div className="grid gap-1">
                    <Label htmlFor="purchase_warehouse_filter">Warehouse</Label>
                    <Select onValueChange={setSelectedWarehouse} value={selectedWarehouse}>
                        <SelectTrigger className="w-[180px]" id="purchase_warehouse_filter">
                            <SelectValue placeholder="All Warehouses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Warehouses</SelectItem>
                            {allWarehouses.map(warehouse => (
                                <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Registered By User Filter */}
                <div className="grid gap-1">
                    <Label htmlFor="purchase_user_filter">Registered By</Label>
                    <Select onValueChange={setSelectedUser} value={selectedUser}>
                        <SelectTrigger className="w-[180px]" id="purchase_user_filter">
                            <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {allUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Product Filter (Combobox) */}
                <div className="grid gap-1">
                    <Label htmlFor="stock_product_filter">Product</Label>
                    <Popover open={isProductComboboxOpen} onOpenChange={setIsProductComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isProductComboboxOpen}
                                className="w-[200px] justify-between"
                            >
                                {selectedProductDisplayName}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                                <CommandInput placeholder="Search product..." />
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all-products-option"
                                        onSelect={() => {
                                            setSelectedProduct('all');
                                            setIsProductComboboxOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", 'all' === selectedProduct ? "opacity-100" : "opacity-0")}/>
                                        All Products
                                    </CommandItem>
                                    {allProducts.map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={`${product.name} (${product.unique_reference})`}
                                            onSelect={() => {
                                                setSelectedProduct(product.id);
                                                setIsProductComboboxOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", product.id === selectedProduct ? "opacity-100" : "opacity-0")}/>
                                            {product.name} ({product.unique_reference})
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <Button onClick={handleResetFilters} variant="outline" className="self-end">Reset Filters</Button>
            </div>

            {/* Purchases Data Table */}
            <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[5%]">SN</TableHead>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead className="w-[150px]">Warehouse</TableHead>
                            <TableHead className="w-[150px]">Total Cost</TableHead>
                            <TableHead className="w-[150px]">Registered By</TableHead>
                            <TableHead className="w-[150px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPurchasesData.length > 0 ? (
                            filteredPurchasesData.map((purchase, idx) => (
                                <TableRow key={purchase.id}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>{new Date(purchase.purchase_date).toLocaleString('en-US', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit', hour12: false
                                    })}</TableCell>
                                    <TableCell>{purchase.warehouses?.name || 'N/A'}</TableCell>
                                    <TableCell>{formatCurrency(purchase.total_cost)}</TableCell>
                                    <TableCell>{purchase.users?.email || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(purchase)}>View Details</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No purchase records found matching your criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Purchase Details Dialog (similar to Sale Details Dialog) */}
            {selectedPurchaseForDetails && (
                <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Purchase Details: {selectedPurchaseForDetails.id}</DialogTitle>
                            <DialogDescription>
                                Details of the purchase recorded on {new Date(selectedPurchaseForDetails.purchase_date).toLocaleString('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                })}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            <div>
                                <p><span className="font-semibold">Warehouse:</span> {selectedPurchaseForDetails.warehouses?.name || 'N/A'}</p>
                                <p><span className="font-semibold">Registered By:</span> {selectedPurchaseForDetails.users?.email || 'N/A'}</p>
                                <p><span className="font-semibold">Purchase Date:</span> {new Date(selectedPurchaseForDetails.purchase_date).toLocaleString()}</p>
                            </div>
                            <div>
                                <p><span className="font-semibold">Total Cost:</span> {formatCurrency(selectedPurchaseForDetails.total_cost)}</p>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold mt-6 mb-3">Items Purchased</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[5%]">SN</TableHead>
                                    <TableHead className="w-[35%]">Product</TableHead>
                                    <TableHead className="w-[10%] text-center">Qty</TableHead>
                                    <TableHead className="w-[10%] text-center">Unit</TableHead>
                                    <TableHead className="w-[15%] text-right">Unit Price</TableHead>
                                    <TableHead className="w-[25%] text-right">Line Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedPurchaseForDetails.purchase_items && selectedPurchaseForDetails.purchase_items.length > 0 ? (
                                    selectedPurchaseForDetails.purchase_items.map((item, itemIdx) => (
                                        <React.Fragment key={item.id}>
                                            <TableRow className="border-b border-gray-200">
                                                <TableCell className="text-sm">{itemIdx + 1}</TableCell>
                                                <TableCell className="font-medium text-gray-900">
                                                    {item.products?.name || 'N/A'} {item.products?.unique_reference && `(${item.products.unique_reference})`}
                                                </TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-center">{item.products?.units?.abbreviation || 'N/A'}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unit_purchase_price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total_cost)}</TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-16 text-center text-gray-500">No items found for this purchase.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <DialogFooter>
                            <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
                            {/* Potential print/export for purchase details here */}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}