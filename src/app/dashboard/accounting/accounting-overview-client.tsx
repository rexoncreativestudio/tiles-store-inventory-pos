// src/app/dashboard/accounting/accounting-overview-client.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useCurrencyFormatter } from '@/lib/formatters';
import { supabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type FinancialSummary = {
    total_sales: number;
    total_purchases: number;
};

type SaleDataForAccounting = {
    sale_date: string;
    total_amount: number;
    branch_id: string;
    branches: { id: string; name: string; } | null;
};

type PurchaseDataForAccounting = {
    purchase_date: string;
    total_cost: number;
};

type ExternalSaleDataForAccounting = {
    sale_date: string;
    total_amount: number;
    total_cost: number;
    branch_id: string;
    branches: { id: string; name: string; } | null;
};

type BranchForSelect = {
  id: string;
  name: string;
};

type BranchSummary = {
    id: string;
    name: string;
    totalSales: number;
    totalExternalSales: number;
    totalBranchIncome: number;
    totalNetProfit: number;
};

interface AccountingOverviewClientProps {
    allSalesData: SaleDataForAccounting[];
    allPurchasesData: PurchaseDataForAccounting[];
    allExternalSalesData: ExternalSaleDataForAccounting[];
    allBranches: BranchForSelect[];
    initialStartDate: string;
    initialEndDate: string;
}

export default function AccountingOverviewClient({ allSalesData, allPurchasesData, allExternalSalesData, allBranches, initialStartDate, initialEndDate }: AccountingOverviewClientProps) {
    const { formatCurrency } = useCurrencyFormatter();

    const [startDate, setStartDate] = useState<Date | undefined>(parseISO(initialStartDate));
    const [endDate, setEndDate] = useState<Date | undefined>(parseISO(initialEndDate));
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(false);

    const [summary, setSummary] = useState<FinancialSummary>({ total_sales: 0, total_purchases: 0 });

    const fetchSummaryData = useCallback(async () => {
        setIsLoading(true);
        const startISO = startDate?.toISOString();
        const endISO = endDate?.toISOString();

        const { data: salesResult, error: salesError } = await supabaseClient
            .from('sales')
            .select('total_amount')
            .gte('sale_date', startISO || '')
            .lte('sale_date', endISO || '');

        if (salesError) {
            console.error("Error fetching sales for accounting:", salesError.message);
            toast.error("Failed to fetch sales data.");
            setIsLoading(false);
            return;
        }

        const { data: purchasesResult, error: purchasesError } = await supabaseClient
            .from('purchases')
            .select('total_cost')
            .gte('purchase_date', startISO || '')
            .lte('purchase_date', endISO || '');

        if (purchasesError) {
            console.error("Error fetching purchases for accounting:", purchasesError.message);
            toast.error("Failed to fetch purchases data.");
            setIsLoading(false);
            return;
        }

        type RawExternalSaleResponse = {
            sale_date: string;
            total_amount: number;
            branch_id: string;
            branches: { id: string; name: string; } | null;
            external_sale_items: Array<{ total_cost: number; }>;
        };

        const { data: externalSalesResult, error: externalSalesError } = await supabaseClient
            .from('external_sales')
            .select(`
                sale_date, total_amount, branch_id,
                external_sale_items(total_cost),
                branches(id, name)
            `)
            .gte('sale_date', startISO || '')
            .lte('sale_date', endISO || '')
            .returns<RawExternalSaleResponse[]>();

        if (externalSalesError) {
            console.error("Error fetching external sales for accounting:", externalSalesError.message);
            toast.error("Failed to fetch external sales data.");
            setIsLoading(false);
            return;
        }

        const processedExternalSalesResult: ExternalSaleDataForAccounting[] = (externalSalesResult || []).map(es => ({
            sale_date: es.sale_date,
            total_amount: es.total_amount,
            branch_id: es.branch_id,
            branches: es.branches,
            total_cost: es.external_sale_items.reduce((sum: number, item) => sum + item.total_cost, 0)
        }));

        const totalSales = salesResult?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
        const totalPurchases = purchasesResult?.reduce((sum, purchase) => sum + purchase.total_cost, 0) || 0;
        const totalExternalSalesIncome = processedExternalSalesResult.reduce((sum, es) => sum + es.total_amount, 0);
        const totalExternalSalesCost = processedExternalSalesResult.reduce((sum, es) => sum + es.total_cost, 0);

        setSummary({ total_sales: totalSales + totalExternalSalesIncome, total_purchases: totalPurchases + totalExternalSalesCost });
        setIsLoading(false);
        toast.success("Financial summary updated.");
    }, [startDate, endDate]);


    const { branchSummaries,  } = useMemo(() => {
        const currentStartDate = startDate;
        const currentEndDate = endDate;

        let filteredSales = allSalesData;
        let filteredPurchases = allPurchasesData;
        let filteredExternalSales = allExternalSalesData;

        if (currentStartDate && currentEndDate) {
            filteredSales = allSalesData.filter(sale => {
                const saleDate = parseISO(sale.sale_date);
                return isWithinInterval(saleDate, { start: currentStartDate, end: currentEndDate });
            });
            filteredPurchases = allPurchasesData.filter(purchase => {
                const purchaseDate = parseISO(purchase.purchase_date);
                return isWithinInterval(purchaseDate, { start: currentStartDate, end: currentEndDate });
            });
            filteredExternalSales = allExternalSalesData.filter(externalSale => {
                const saleDate = parseISO(externalSale.sale_date);
                return isWithinInterval(saleDate, { start: currentStartDate, end: currentEndDate });
            });
        }

        const consolidatedPurchasesTotal = filteredPurchases.reduce((sum: number, p) => sum + p.total_cost, 0);
        const overallTotalSales = filteredSales.reduce((sum: number, sale) => sum + sale.total_amount, 0);
        const overallExternalSalesIncome = filteredExternalSales.reduce((sum: number, es) => sum + es.total_amount, 0);
        const overallExternalSalesCost = filteredExternalSales.reduce((sum: number, es) => sum + es.total_cost, 0);

        const totalIncome = overallTotalSales + overallExternalSalesIncome;
        const totalExpenses = consolidatedPurchasesTotal + overallExternalSalesCost;
        const overallNetProfit = totalIncome - totalExpenses;

        const salesByBranch: Record<string, { regularSales: number; externalSales: number; }> = {};
        filteredSales.forEach(sale => {
            const branchId = sale.branch_id;
            if (!salesByBranch[branchId]) salesByBranch[branchId] = { regularSales: 0, externalSales: 0 };
            salesByBranch[branchId].regularSales += sale.total_amount;
        });
        filteredExternalSales.forEach(externalSale => {
            const branchId = externalSale.branch_id;
            if (!salesByBranch[branchId]) salesByBranch[branchId] = { regularSales: 0, externalSales: 0 };
            salesByBranch[branchId].externalSales += externalSale.total_amount;
        });

        const branchSummaries: BranchSummary[] = allBranches.map(branch => {
            const regularSales = salesByBranch[branch.id]?.regularSales || 0;
            const externalSales = salesByBranch[branch.id]?.externalSales || 0;
            const totalBranchIncome = regularSales + externalSales;

            return {
                id: branch.id,
                name: branch.name,
                totalSales: regularSales,
                totalExternalSales: externalSales,
                totalBranchIncome: totalBranchIncome,
                totalNetProfit: totalBranchIncome
            };
        });

        const filteredBranchSummaries = selectedBranchFilter !== 'all'
            ? branchSummaries.filter(summary => summary.id === selectedBranchFilter)
            : branchSummaries;

        return {
            overallTotalSales: totalIncome,
            consolidatedPurchasesTotal: totalExpenses,
            branchSummaries: filteredBranchSummaries,
            overallNetProfit
        };
    }, [allSalesData, allPurchasesData, allExternalSalesData, startDate, endDate, allBranches, selectedBranchFilter]);


    const handleResetFilters = () => {
        const defaultEndDate = new Date();
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultEndDate.getDate() - 30);
        setStartDate(defaultStartDate);
        setEndDate(defaultEndDate);
        setSelectedBranchFilter('all');
        fetchSummaryData();
    };

    useEffect(() => {
        fetchSummaryData();
    }, [startDate, endDate, selectedBranchFilter, fetchSummaryData]);


    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-4 mb-6">
                <div className="grid gap-1">
                    <Label htmlFor="date_from_accounting">Date From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={setStartDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="date_to_accounting">Date To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !endDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={setEndDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="branch_accounting_filter">Branch</Label>
                    <Select onValueChange={setSelectedBranchFilter} value={selectedBranchFilter}>
                        <SelectTrigger className="w-[180px]" id="branch_accounting_filter">
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
                <Button onClick={fetchSummaryData} disabled={isLoading} className="self-end">
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Apply Filters'}
                </Button>
                <Button onClick={handleResetFilters} variant="outline" className="self-end" disabled={isLoading}>Reset Filters</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Purchases (Consolidated)
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.total_purchases)}</div>
                        <p className="text-xs text-muted-foreground">
                            All purchases within selected period
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Overall Sales Income (All Sources)
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.total_sales)}</div>
                        <p className="text-xs text-muted-foreground">
                            All sales across all branches (regular + external)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit (Overall)</CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.total_sales - summary.total_purchases)}</div>
                        <p className="text-xs text-muted-foreground">
                            Overall Income - Overall Expenses
                        </p>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-bold mt-8 mb-4">Branch Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {branchSummaries.length > 0 ? (
                    branchSummaries.map(branch => (
                        <Card key={branch.id}>
                            <CardHeader>
                                <CardTitle>{branch.name} Performance</CardTitle>
                                <CardDescription>Income and profit for {branch.name}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>Regular Sales:</span>
                                    <span>{formatCurrency(branch.totalSales)}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold mt-1">
                                    <span>External Sales:</span>
                                    <span>{formatCurrency(branch.totalExternalSales)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center text-xl font-extrabold">
                                    <span>Total Branch Income:</span>
                                    <span>{formatCurrency(branch.totalBranchIncome)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Sum of regular and external sales for this branch.
                                </p>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center text-xl font-extrabold text-green-700">
                                    <span>Net Profit ({branch.name}):</span>
                                    <span>{formatCurrency(branch.totalNetProfit)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Simplified: Branch income as net profit (purchases consolidated).
                                </p>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p className="text-gray-500 col-span-full text-center">No sales data for selected filters or branches.</p>
                )}
            </div>
        </div>
    );
}