// src/app/dashboard/accounting/accounting-overview-client.tsx

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, Package, BarChart3, TrendingUp, Banknote } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useCurrencyFormatter } from '@/lib/formatters';
import { Separator } from '@/components/ui/separator';

// Import types
import {
  SaleDataForAccounting,
  PurchaseDataForAccounting,
  ExternalSaleDataForAccounting,
  ExpenseDataForAccounting,
  StockDetailForInventory,
  BranchForSelect,
  FinancialSummary,
  BranchFinancialSummary,
  InventorySummary,
  WarehouseInventoryBreakdown,
} from '../types';

interface AccountingOverviewClientProps {
    allSalesData: SaleDataForAccounting[];
    allPurchasesData: PurchaseDataForAccounting[];
    allExternalSalesData: ExternalSaleDataForAccounting[];
    allExpensesData: ExpenseDataForAccounting[];
    allStockDetails: StockDetailForInventory[];
    allBranches: BranchForSelect[];
    initialStartDate: string;
    initialEndDate: string;
}

export default function AccountingOverviewClient({ 
    allSalesData,
    allPurchasesData,
    allExternalSalesData,
    allExpensesData,
    allStockDetails,
    allBranches,
    initialStartDate,
    initialEndDate
}: AccountingOverviewClientProps) {
    const { formatCurrency } = useCurrencyFormatter();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Date filters
    const [startDate, setStartDate] = useState<Date | undefined>(parseISO(initialStartDate));
    const [endDate, setEndDate] = useState<Date | undefined>(parseISO(initialEndDate));

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (startDate) params.set('dateFrom', startDate.toISOString());
        else params.delete('dateFrom');
        
        if (endDate) params.set('dateTo', endDate.toISOString());
        else params.delete('dateTo');

        router.replace(`/dashboard/accounting?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const handleResetDates = () => {
        setStartDate(undefined);
        setEndDate(undefined);
    };

    // --- Overall Financial Summary (Memoized Calculations) ---
    const financialSummary: FinancialSummary = useMemo(() => {
        const dateRange = (startDate && endDate) ? { start: startDate, end: endDate } : null;

        const filteredSales = allSalesData.filter(sale => !dateRange || isWithinInterval(parseISO(sale.sale_date), dateRange));
        const filteredPurchases = allPurchasesData.filter(purchase => !dateRange || isWithinInterval(parseISO(purchase.purchase_date), dateRange));
        const filteredExternalSales = allExternalSalesData.filter(es => !dateRange || isWithinInterval(parseISO(es.sale_date), dateRange));
        const filteredExpenses = allExpensesData.filter(expense => !dateRange || isWithinInterval(parseISO(expense.date), dateRange));

        const totalSalesIncome = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0) +
                                 filteredExternalSales.reduce((sum, es) => sum + es.total_amount, 0);

        const totalRegularSalesCOGS = filteredSales.reduce((sum, sale) =>
            sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.products?.purchase_price || 0) * (item.quantity || 0), 0) || 0)
        , 0);
        const totalExternalSalesCOGS = filteredExternalSales.reduce((sum, es) => sum + es.total_cost, 0);
        const totalCOGS = totalRegularSalesCOGS + totalExternalSalesCOGS;

        const totalPurchasesCost = filteredPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0);
        const totalExpensesAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

        // --- START: CORRECTED LOGIC ---
        // Correct Net Profit Formula: Income - COGS - Expenses
        const overallNetProfit = totalSalesIncome - totalCOGS - totalExpensesAmount;
        // --- END: CORRECTED LOGIC ---

        return {
            total_sales_income: totalSalesIncome,
            total_purchases_cost: totalPurchasesCost,
            total_expenses_amount: totalExpensesAmount,
            overall_net_profit: overallNetProfit,
        };
    }, [allSalesData, allPurchasesData, allExternalSalesData, allExpensesData, startDate, endDate]);

    // --- Branch Financial Summaries (Memoized Calculations) ---
    const branchFinancialSummaries: BranchFinancialSummary[] = useMemo(() => {
        const dateRange = (startDate && endDate) ? { start: startDate, end: endDate } : null;
        const branchData: Record<string, { income: number; purchases: number; expenses: number; cogs: number }> = {};

        allBranches.forEach(branch => {
            branchData[branch.id] = { income: 0, purchases: 0, expenses: 0, cogs: 0 };
        });

        // Filter all data once
        const filteredSales = allSalesData.filter(sale => !dateRange || isWithinInterval(parseISO(sale.sale_date), dateRange));
        const filteredExternalSales = allExternalSalesData.filter(es => !dateRange || isWithinInterval(parseISO(es.sale_date), dateRange));
        const filteredPurchases = allPurchasesData.filter(purchase => !dateRange || isWithinInterval(parseISO(purchase.purchase_date), dateRange));
        const filteredExpenses = allExpensesData.filter(expense => !dateRange || isWithinInterval(parseISO(expense.date), dateRange));
        
        // Aggregate income and COGS
        filteredSales.forEach(sale => {
            if (sale.branch_id) {
                branchData[sale.branch_id].income += sale.total_amount;
                const cogsForSale = sale.sale_items?.reduce((itemSum, item) => itemSum + (item.products?.purchase_price || 0) * (item.quantity || 0), 0) || 0;
                branchData[sale.branch_id].cogs += cogsForSale;
            }
        });
        filteredExternalSales.forEach(externalSale => {
            if (externalSale.branch_id) {
                branchData[externalSale.branch_id].income += externalSale.total_amount;
                branchData[externalSale.branch_id].cogs += externalSale.total_cost;
            }
        });

        // Aggregate purchases and expenses
        filteredPurchases.forEach(purchase => {
            if (purchase.branch_id) branchData[purchase.branch_id].purchases += purchase.total_cost;
        });
        filteredExpenses.forEach(expense => {
            if (expense.branch_id) branchData[expense.branch_id].expenses += expense.amount;
        });

        return allBranches.map(branch => {
            const data = branchData[branch.id];
            // --- START: CORRECTED LOGIC ---
            // Correct Branch Net Profit Formula: Income - COGS - Expenses
            const netProfit = data.income - data.cogs - data.expenses;
            // --- END: CORRECTED LOGIC ---

            return {
                id: branch.id,
                name: branch.name,
                total_sales_income: data.income,
                total_purchases_cost: data.purchases,
                total_expenses_amount: data.expenses,
                net_profit: netProfit,
            };
        }).sort((a, b) => b.net_profit - a.net_profit);
    }, [allSalesData, allExternalSalesData, allPurchasesData, allExpensesData, allBranches, startDate, endDate]);

    // --- Inventory Report (Memoized Calculations) ---
    const inventorySummary: InventorySummary = useMemo(() => {
        let totalInventoryCost = 0;
        const totalUniqueProductsInStock = new Set<string>();
        let totalStockQuantity = 0;

        allStockDetails.forEach(stock => {
            if (stock.products) {
                totalInventoryCost += stock.quantity * (stock.products.purchase_price || 0);
                totalUniqueProductsInStock.add(stock.product_id);
                totalStockQuantity += stock.quantity;
            }
        });

        return {
            total_inventory_cost: totalInventoryCost,
            total_unique_products_in_stock: totalUniqueProductsInStock.size,
            total_stock_quantity: totalStockQuantity,
        };
    }, [allStockDetails]);

    const warehouseInventoryBreakdown: WarehouseInventoryBreakdown[] = useMemo(() => {
        const warehouseData: Record<string, { id: string; name: string; cost: number; products: Set<string>; quantity: number; }> = {};

        allStockDetails.forEach(stock => {
            if (stock.warehouses && !warehouseData[stock.warehouses.id]) {
                warehouseData[stock.warehouses.id] = { id: stock.warehouses.id, name: stock.warehouses.name, cost: 0, products: new Set(), quantity: 0 };
            }
        });

        allStockDetails.forEach(stock => {
            if (stock.warehouses && stock.products) {
                warehouseData[stock.warehouses.id].cost += stock.quantity * (stock.products.purchase_price || 0);
                warehouseData[stock.warehouses.id].products.add(stock.product_id);
                warehouseData[stock.warehouses.id].quantity += stock.quantity;
            }
        });

        return Object.values(warehouseData).map(data => ({
            id: data.id,
            name: data.name,
            total_inventory_cost: data.cost,
            total_unique_products: data.products.size,
            total_stock_quantity: data.quantity,
        })).sort((a, b) => b.total_inventory_cost - a.total_inventory_cost);
    }, [allStockDetails]);


    // --- Render ---
    return (
        <div className="p-8 space-y-8 bg-white">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-6 p-4 rounded-lg shadow-sm bg-white border">
                <div className="grid gap-1">
                    <Label htmlFor="date_from_accounting">Date From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-[180px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="date_to_accounting">Date To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-[180px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="outline" onClick={handleResetDates} className="self-end">Reset Dates</Button>
            </div>

            {/* --- Overall Financial Summary Cards --- */}
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Financial Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales Income</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(financialSummary.total_sales_income)}</div>
                        <p className="text-xs text-muted-foreground">Gross income from all sales</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Purchases Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(financialSummary.total_purchases_cost)}</div>
                        <p className="text-xs text-muted-foreground">Total cost of inventory purchases</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(financialSummary.total_expenses_amount)}</div>
                        <p className="text-xs text-muted-foreground">Sum of all recorded expenses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Net Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", financialSummary.overall_net_profit >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(financialSummary.overall_net_profit)}
                        </div>
                        <p className="text-xs text-muted-foreground">Income - COGS - Expenses</p>
                    </CardContent>
                </Card>
            </div>

            {/* --- Branch Performance Section --- */}
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800">Branch Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {branchFinancialSummaries.length > 0 ? (
                    branchFinancialSummaries.map(branch => (
                        <Card key={branch.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">{branch.name}</CardTitle>
                                <CardDescription>Financial summary for this branch.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-between">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Sales Income:</span>
                                        <span>{formatCurrency(branch.total_sales_income)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Purchases Cost:</span>
                                        <span>{formatCurrency(branch.total_purchases_cost)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Expenses:</span>
                                        <span>{formatCurrency(branch.total_expenses_amount)}</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center text-base font-bold">
                                        <span>Net Profit:</span>
                                        <span className={cn(branch.net_profit >= 0 ? "text-green-600" : "text-red-600")}>
                                            {formatCurrency(branch.net_profit)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p className="text-gray-500 col-span-full text-center p-4 rounded-lg bg-white shadow-sm border">No financial data for branches within the selected period.</p>
                )}
            </div>

            {/* --- Inventory Report Section --- */}
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800">Inventory Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Inventory Summary Cards */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(inventorySummary.total_inventory_cost)}</div>
                        <p className="text-xs text-muted-foreground">Value of all products in stock</p>
                    </CardContent>
                </Card>
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Products (SKUs)</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inventorySummary.total_unique_products_in_stock}</div>
                        <p className="text-xs text-muted-foreground">Unique product types in stock</p>
                    </CardContent>
                </Card>
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock Quantity</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inventorySummary.total_stock_quantity}</div>
                        <p className="text-xs text-muted-foreground">Sum of all product units in stock</p>
                    </CardContent>
                </Card>
            </div>

            {/* Warehouse Breakdown Section */}
            <h3 className="text-xl font-semibold mt-6 mb-4 text-gray-800">Warehouse Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {warehouseInventoryBreakdown.length > 0 ? (
                    warehouseInventoryBreakdown.map(warehouse => (
                        <Card key={warehouse.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                                <CardDescription>Inventory summary for {warehouse.name}.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-between">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Total Inventory Cost:</span>
                                        <span>{formatCurrency(warehouse.total_inventory_cost)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Unique Products:</span>
                                        <span>{warehouse.total_unique_products}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Total Stock Quantity:</span>
                                        <span>{warehouse.total_stock_quantity}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p className="text-gray-500 col-span-full text-center p-4 rounded-lg bg-white shadow-sm border">No inventory data available for warehouses.</p>
                )}
            </div>
        </div>
    );
}  