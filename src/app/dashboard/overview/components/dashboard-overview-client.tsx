"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, Package, TrendingUp, Banknote, ShoppingCart, Warehouse, LineChart as LineChartIcon, BarChart2 as BarChartIcon } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useCurrencyFormatter } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Charting ---
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

import {
  DashboardSummaryCards,
  WarehouseBreakdownItem,
  SaleData,
  PurchaseData,
  ExternalSaleData,
  ExpenseData,
  StockData,
  BranchData,
} from '../types';

interface RevenueChartDatum {
  name: string;
  Revenue: number;
}

interface BranchChartDatum {
  name: string;
  Revenue: number;
}

interface DashboardOverviewClientProps {
  allSalesData: SaleData[];
  allPurchasesData: PurchaseData[]; // Will be removed from usage
  allExternalSalesData: ExternalSaleData[];
  allExpensesData: ExpenseData[];
  allStockData: StockData[];
  allBranches: BranchData[]; // Will be removed from usage
  initialStartDate: string;
  initialEndDate: string;
}

// --- Utility functions ---
function groupByTimeframe(data: Array<{ date: string; amount: number }>, timeframe: 'day' | 'week' | 'month'): RevenueChartDatum[] {
  const map: Record<string, number> = {};
  data.forEach(({ date, amount }) => {
    const d = parseISO(date);
    const key = timeframe === 'day' ? format(d, "yyyy-MM-dd") : timeframe === 'week' ? format(d, "yyyy-ww") : format(d, "yyyy-MM");
    map[key] = (map[key] || 0) + amount;
  });
  return Object.entries(map).map(([label, value]) => ({ name: label, Revenue: value })).sort((a, b) => a.name.localeCompare(b.name));
}

function groupBranchTotals(data: Array<{ branch_id: string; branch_name: string; amount: number }>): BranchChartDatum[] {
  const map: Record<string, { branch_name: string; value: number }> = {};
  data.forEach(({ branch_id, branch_name, amount }) => {
    if (!map[branch_id]) map[branch_id] = { branch_name, value: 0 };
    map[branch_id].value += amount;
  });
  return Object.values(map).map(({ branch_name, value }) => ({ name: branch_name, Revenue: value }));
}

export default function DashboardOverviewClient({
  allSalesData,

  allExternalSalesData,
  allExpensesData,
  allStockData,
}: Omit<DashboardOverviewClientProps, 'allPurchasesData' | 'allBranches'>) {
  const { formatCurrency } = useCurrencyFormatter();
  const router = useRouter();

  // Default date range to the current month
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [revenueChartTimeframe, setRevenueChartTimeframe] = useState<'day' | 'week' | 'month'>('day');

  const applyDateFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set('dateFrom', startDate.toISOString());
    params.set('dateTo', endDate.toISOString());
    router.push(`/dashboard/overview?${params.toString()}`);
  }, [startDate, endDate, router]);

  useEffect(() => {
    applyDateFilters();
  }, [startDate, endDate, applyDateFilters]);

  const dashboardSummary: DashboardSummaryCards = useMemo(() => {
    const dateRange = { start: startDate, end: endDate };
    const filteredSales = allSalesData.filter(s => isWithinInterval(parseISO(s.sale_date), dateRange));
    const filteredExternalSales = allExternalSalesData.filter(es => isWithinInterval(parseISO(es.sale_date), dateRange));
    const filteredExpenses = allExpensesData.filter(e => isWithinInterval(parseISO(e.date), dateRange));

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0) +
                         filteredExternalSales.reduce((sum, es) => sum + es.total_amount, 0);

    const totalSalesCount = filteredSales.length + filteredExternalSales.length;

    const totalRegularSalesCOGS = filteredSales.reduce((sum, sale) =>
      sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.products?.purchase_price || 0) * (item.quantity || 0), 0) || 0), 0);

    const totalExternalSalesCOGS = allExternalSalesData.reduce((sum, es) =>
      sum + (es.external_sale_items?.reduce((itemSum, item) => itemSum + item.total_cost, 0) || 0), 0);

    const totalCOGS = totalRegularSalesCOGS + totalExternalSalesCOGS;
    const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const netProfit = totalRevenue - totalCOGS - totalExpensesAmount;

    let totalInventoryValue = 0;
    const totalUniqueProductsInStock = new Set<string>();
    allStockData.forEach(stock => {
      if (stock.products) {
        totalInventoryValue += stock.quantity * (stock.products.purchase_price || 0);
        totalUniqueProductsInStock.add(stock.product_id);
      }
    });

    return {
      total_revenue: totalRevenue,
      net_profit: netProfit,
      total_sales_count: totalSalesCount,
      total_inventory_value: totalInventoryValue,
      total_unique_products_in_stock: totalUniqueProductsInStock.size,
    };
  }, [allSalesData, allExternalSalesData, allExpensesData, allStockData, startDate, endDate]);

  const revenueChartData: RevenueChartDatum[] = useMemo(() => {
    const dateRange = { start: startDate, end: endDate };
    const sales = allSalesData.filter(s => isWithinInterval(parseISO(s.sale_date), dateRange)).map(s => ({ date: s.sale_date, amount: s.total_amount }));
    const externalSales = allExternalSalesData.filter(es => isWithinInterval(parseISO(es.sale_date), dateRange)).map(es => ({ date: es.sale_date, amount: es.total_amount }));
    return groupByTimeframe([...sales, ...externalSales], revenueChartTimeframe);
  }, [allSalesData, allExternalSalesData, startDate, endDate, revenueChartTimeframe]);

  const branchPerformanceChartData: BranchChartDatum[] = useMemo(() => {
    const dateRange = { start: startDate, end: endDate };
    const sales = allSalesData.filter(s => isWithinInterval(parseISO(s.sale_date), dateRange)).map(s => ({ branch_id: s.branch_id, branch_name: s.branches?.name ?? "Unknown", amount: s.total_amount }));
    const externalSales = allExternalSalesData.filter(es => isWithinInterval(parseISO(es.sale_date), dateRange)).map(es => ({ branch_id: es.branch_id, branch_name: es.branches?.name ?? "Unknown", amount: es.total_amount }));
    return groupBranchTotals([...sales, ...externalSales]);
  }, [allSalesData, allExternalSalesData, startDate, endDate]);

  const warehouseBreakdown: WarehouseBreakdownItem[] = useMemo(() => {
    const breakdown: Record<string, { id: string; name: string; cost: number; product_count: Set<string>; quantity: number; }> = {};
    allStockData.forEach(stock => {
      const wh = stock.warehouses;
      if (wh && !breakdown[wh.id]) {
        breakdown[wh.id] = { id: wh.id, name: wh.name, cost: 0, product_count: new Set(), quantity: 0 };
      }
      if (wh && stock.products) {
        breakdown[wh.id].cost += stock.quantity * (stock.products.purchase_price || 0);
        breakdown[wh.id].product_count.add(stock.product_id);
        breakdown[wh.id].quantity += stock.quantity;
      }
    });
    return Object.values(breakdown).map(data => ({
      id: data.id,
      name: data.name,
      total_inventory_cost: data.cost,
      product_count: data.product_count.size,
      total_stock_quantity: data.quantity,
    })).sort((a, b) => b.total_inventory_cost - a.total_inventory_cost);
  }, [allStockData]);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* --- Filter Controls --- */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
                <Label htmlFor="date_from_dashboard">Date From</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[200px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="date_to_dashboard">Date To</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[200px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
      </Card>

      {/* --- Summary Cards --- */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-800 mb-4">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(dashboardSummary.total_revenue)}</div>
                    <p className="text-xs text-muted-foreground">Sales income in selected period</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", dashboardSummary.net_profit >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(dashboardSummary.net_profit)}
                    </div>
                    <p className="text-xs text-muted-foreground">Revenue - COGS - Expenses</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{dashboardSummary.total_sales_count}</div>
                    <p className="text-xs text-muted-foreground">Transactions in period</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(dashboardSummary.total_inventory_value)}</div>
                    <p className="text-xs text-muted-foreground">Cost of all products in stock</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Product SKUs</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{dashboardSummary.total_unique_products_in_stock}</div>
                    <p className="text-xs text-muted-foreground">Unique products with stock</p>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* --- Revenue Trends Chart Section --- */}
      <div className="w-full">
        <Card className="shadow-lg rounded-xl">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6">
                <div className="mb-4 sm:mb-0">
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LineChartIcon className="h-6 w-6 text-indigo-600" />
                        Revenue Trends
                    </CardTitle>
                    <CardDescription>Track sales income over the selected period.</CardDescription>
                </div>
                <Select onValueChange={(value: 'day' | 'week' | 'month') => setRevenueChartTimeframe(value)} value={revenueChartTimeframe}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">By Day</SelectItem>
                        <SelectItem value="week">By Week</SelectItem>
                        <SelectItem value="month">By Month</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={revenueChartData}
                          margin={{ top: 5, right: 20, left: 20, bottom: 35 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                                dataKey="name"
                                stroke="#6b7280"
                                fontSize={12}
                                interval={0}
                                angle={-25}
                                textAnchor="end"
                                minTickGap={0}
                                padding={{ left: 15, right: 15 }}
                                height={50}
                            />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={12}
                                tickFormatter={(value) => formatCurrency(Number(value))}
                                allowDecimals={false}
                                domain={['auto', 'auto']}
                                width={90}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                                labelStyle={{ fontWeight: 'bold' }}
                                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="Revenue" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* --- Branch Performance Chart Section --- */}
      <div className="w-full">
        <Card className="shadow-lg rounded-xl">
            <CardHeader className="p-6">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChartIcon className="h-6 w-6 text-green-600" />
                    Performance by Branch
                </CardTitle>
                <CardDescription>Compare total revenue across different branches for the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={branchPerformanceChartData}
                          margin={{ top: 5, right: 20, left: 20, bottom: 35 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                                dataKey="name"
                                stroke="#6b7280"
                                fontSize={12}
                                interval={0}
                                angle={-25}
                                textAnchor="end"
                                minTickGap={0}
                                padding={{ left: 15, right: 15 }}
                                height={50}
                            />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={12}
                                tickFormatter={(value) => formatCurrency(Number(value))}
                                allowDecimals={false}
                                domain={['auto', 'auto']}
                                width={90}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                                labelStyle={{ fontWeight: 'bold' }}
                                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                            />
                            <Legend />
                            <Bar dataKey="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* --- Warehouse Breakdown Section --- */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-800 mb-4">Inventory by Warehouse</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouseBreakdown.length > 0 ? (
            warehouseBreakdown.map(warehouse => (
                <Card key={warehouse.id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Warehouse className="h-5 w-5 text-muted-foreground" /> {warehouse.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm"><span>Total Inventory Cost:</span> <span className="font-semibold">{formatCurrency(warehouse.total_inventory_cost)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Unique Products:</span> <span className="font-semibold">{warehouse.product_count}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Total Stock Quantity:</span> <span className="font-semibold">{warehouse.total_stock_quantity}</span></div>
                    </div>
                </CardContent>
                </Card>
            ))
            ) : (
            <p className="text-gray-500 col-span-full text-center p-4 rounded-lg bg-white border">No inventory data available.</p>
            )}
        </div>
      </div>
    </div>
  );
}
 