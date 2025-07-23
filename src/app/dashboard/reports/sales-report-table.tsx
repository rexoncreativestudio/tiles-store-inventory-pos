// src/app/dashboard/reports/sales-report-table.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Printer } from "lucide-react";
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
import { useRouter } from 'next/navigation';


// CORRECTED: Ensure types are complete and consistent with page.tsx
type SaleDataForReport = {
    id: string; // Ensure ID is part of the type
    sale_date: string;
    total_amount: number;
    branch_id: string;
    cashier_id: string;
    status: 'completed' | 'held' | 'cancelled';
    transaction_reference: string;
    customer_name: string | null;
    customer_phone: string | null;
    payment_method: string; // Ensure this is selected
    users: { id: string; email: string; } | null;
    branches: { id: string; name: string; } | null;
    sale_items: Array<{
      id: string; product_id: string; quantity: number; unit_sale_price: number;
      total_price: number; note: string | null;
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

interface SalesReportTableProps {
    allSalesData: SaleDataForReport[];
    allBranches: BranchForSelect[];
    allCashiers: UserForSelect[];
}

export default function SalesReportTable({ allSalesData, allBranches, allCashiers }: SalesReportTableProps) {
    const { formatCurrency } = useCurrencyFormatter();
    const router = useRouter();

    // Filter states
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedCashier, setSelectedCashier] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [searchRef, setSearchRef] = useState<string>(''); // For transaction reference search

    // State for View Details Modal
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleDataForReport | null>(null);

    // Filter sales data based on state
    const filteredSalesData = useMemo(() => {
        let filtered = allSalesData;

        if (dateFrom) {
            filtered = filtered.filter(sale => new Date(sale.sale_date) >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter(sale => new Date(sale.sale_date) <= dateTo);
        }
        if (selectedBranch !== 'all') {
            filtered = filtered.filter(sale => sale.branch_id === selectedBranch);
        }
        if (selectedCashier !== 'all') {
            filtered = filtered.filter(sale => sale.cashier_id === selectedCashier);
        }
        if (selectedStatus !== 'all') {
            // Corrected: Cast selectedStatus to a valid SaleRecord status type for comparison
            filtered = filtered.filter(sale => sale.status === selectedStatus as SaleDataForReport['status']);
        }
        if (searchRef) {
            filtered = filtered.filter(sale => sale.transaction_reference.toLowerCase().includes(searchRef.toLowerCase()));
        }

        return filtered;
    }, [allSalesData, dateFrom, dateTo, selectedBranch, selectedCashier, selectedStatus, searchRef]);


    const handleResetFilters = () => {
        setDateFrom(undefined);
        setDateTo(undefined);
        setSelectedBranch('all');
        setSelectedCashier('all');
        setSelectedStatus('all');
        setSearchRef('');
    };

    const handleViewDetails = (sale: SaleDataForReport) => {
        setSelectedSaleForDetails(sale);
        setIsDetailsDialogOpen(true);
    };

    const handleReprintReceipt = (transactionRef: string) => {
        router.push(`/receipt/${transactionRef}`);
        // Optionally: window.open(`/receipt/${transactionRef}`, '_blank');
    };

    const getStatusColorClass = (status: 'completed' | 'held' | 'cancelled') => {
        switch (status) {
          case 'completed': return 'text-green-600 font-medium';
          case 'held': return 'text-yellow-600 font-medium';
          case 'cancelled': return 'text-red-600 font-medium';
          default: return '';
        }
      };


    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
                {/* Date From */}
                <div className="grid gap-1">
                    <Label htmlFor="sales_date_from">Date From</Label>
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
                    <Label htmlFor="sales_date_to">Date To</Label>
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
                {/* Branch Filter */}
                <div className="grid gap-1">
                    <Label htmlFor="sales_branch_filter">Branch</Label>
                    <Select onValueChange={setSelectedBranch} value={selectedBranch}>
                        <SelectTrigger className="w-[180px]" id="sales_branch_filter">
                            <SelectValue placeholder="All Branches" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {allBranches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Cashier Filter */}
                <div className="grid gap-1">
                    <Label htmlFor="sales_cashier_filter">Cashier</Label>
                    <Select onValueChange={setSelectedCashier} value={selectedCashier}>
                        <SelectTrigger className="w-[180px]" id="sales_cashier_filter">
                            <SelectValue placeholder="All Cashiers" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Cashiers</SelectItem>
                            {allCashiers.map(cashier => (
                                <SelectItem key={cashier.id} value={cashier.id}>{cashier.email}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 {/* Status Filter */}
                 <div className="grid gap-1">
                    <Label htmlFor="sales_status_filter">Status</Label>
                    <Select onValueChange={setSelectedStatus} value={selectedStatus}>
                        <SelectTrigger className="w-[180px]" id="sales_status_filter">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="held">Held</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/* Transaction Reference Search */}
                <div className="grid gap-1">
                    <Label htmlFor="search_ref">Transaction Ref</Label>
                    <Input
                        id="search_ref"
                        placeholder="Search by reference..."
                        className="w-[180px]"
                        value={searchRef}
                        onChange={(e) => setSearchRef(e.target.value)}
                    />
                </div>
                <Button onClick={handleResetFilters} variant="outline" className="self-end">Reset Filters</Button>
            </div>

            {/* Sales Data Table */}
            <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">SN</TableHead>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead className="w-[150px]">Ref.</TableHead>
                            <TableHead className="w-[150px]">Cashier</TableHead>
                            <TableHead className="w-[150px]">Branch</TableHead>
                            <TableHead className="w-[150px]">Customer</TableHead>
                            <TableHead className="w-[100px] text-right">Amount</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[150px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSalesData.length > 0 ? (
                            filteredSalesData.map((sale, idx) => (
                                <TableRow key={sale.id}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>{new Date(sale.sale_date).toLocaleString('en-US', {
                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                        hour: '2-digit', minute: '2-digit', hour12: false
                                    })}</TableCell>
                                    <TableCell className="font-medium">{sale.transaction_reference}</TableCell>
                                    <TableCell>{sale.users?.email || 'N/A'}</TableCell>
                                    <TableCell>{sale.branches?.name || 'N/A'}</TableCell>
                                    <TableCell>{sale.customer_name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(sale.total_amount)}</TableCell>
                                    <TableCell><span className={getStatusColorClass(sale.status)}>{sale.status.toUpperCase()}</span></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(sale)}>View Details</Button>
                                            <Button variant="outline" size="sm" onClick={() => handleReprintReceipt(sale.transaction_reference)}><Printer className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No sales records found matching your criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Sale Details Dialog */}
            {selectedSaleForDetails && (
                <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Sale Details: {selectedSaleForDetails.transaction_reference}</DialogTitle>
                            <DialogDescription>
                                Details of the sale recorded on {new Date(selectedSaleForDetails.sale_date).toLocaleString('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                })}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            <div>
                                <p><span className="font-semibold">Cashier:</span> {selectedSaleForDetails.users?.email || 'N/A'}</p>
                                <p><span className="font-semibold">Branch:</span> {selectedSaleForDetails.branches?.name || 'N/A'}</p>
                                <p><span className="font-semibold">Customer:</span> {selectedSaleForDetails.customer_name || 'Walk-in'}</p>
                                <p><span className="font-semibold">Customer Phone:</span> {selectedSaleForDetails.customer_phone || 'N/A'}</p>
                            </div>
                            <div>
                                <p><span className="font-semibold">Total Amount:</span> {formatCurrency(selectedSaleForDetails.total_amount)}</p>
                                <p><span className="font-semibold">Payment Method:</span> {selectedSaleForDetails.payment_method}</p>
                                <p><span className="font-semibold">Status:</span> <span className={getStatusColorClass(selectedSaleForDetails.status)}>{selectedSaleForDetails.status.toUpperCase()}</span></p>
                                <p><span className="font-semibold">Transaction Ref:</span> {selectedSaleForDetails.transaction_reference}</p>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold mt-6 mb-3">Items Sold</h3>
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
                                {selectedSaleForDetails.sale_items && selectedSaleForDetails.sale_items.length > 0 ? (
                                    selectedSaleForDetails.sale_items.map((item, itemIdx) => (
                                        <React.Fragment key={item.id}>
                                            <TableRow className="border-b border-gray-200">
                                                <TableCell className="text-sm">{itemIdx + 1}</TableCell>
                                                <TableCell className="font-medium text-gray-900">
                                                    {item.products?.name || 'N/A'} {item.products?.unique_reference && `(${item.products.unique_reference})`}
                                                    {item.note && <span className="block text-xs italic text-gray-500">Note: {item.note}</span>}
                                                </TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-center">{item.products?.units?.abbreviation || 'N/A'}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unit_sale_price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-16 text-center text-gray-500">No items found for this sale.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <DialogFooter>
                            <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
                            <Button onClick={() => handleReprintReceipt(selectedSaleForDetails.transaction_reference)}><Printer className="h-4 w-4 mr-2" /> Reprint Receipt</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}