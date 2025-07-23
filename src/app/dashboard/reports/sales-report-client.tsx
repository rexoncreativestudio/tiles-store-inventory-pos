// src/app/dashboard/reports/sales-report-client.tsx
"use client";

import React, { useState, useMemo } from 'react'; // Removed useEffect
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useCurrencyFormatter } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
// Removed Input import
// import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar"; // CORRECTED: Import Calendar


// Define types for data (consistent with page.tsx)
type SaleDataForReport = {
    sale_date: string;
    total_amount: number;
    branch_id: string;
    cashier_id: string;
    users: { id: string; email: string; } | null;
    branches: { id: string; name: string; } | null;
};

type BranchForSelect = {
  id: string;
  name: string;
};

type UserForSelect = {
  id: string;
  email: string;
};

interface SalesReportClientProps {
    allSalesData: SaleDataForReport[];
    allBranches: BranchForSelect[];
    allCashiers: UserForSelect[];
}

export default function SalesReportClient({ allSalesData, allBranches, allCashiers }: SalesReportClientProps) {
    const { currencySymbol } = useCurrencyFormatter();

    // Filter states
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedCashier, setSelectedCashier] = useState<string>('all');

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

        // Aggregate by date for charting
        const processedData = filtered.reduce((acc, sale) => {
            const date = new Date(sale.sale_date).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); // YYYY-MM-DD
            if (!acc[date]) {
                acc[date] = { date, total: 0 };
            }
            acc[date].total += sale.total_amount;
            return acc;
        }, {} as Record<string, { date: string; total: number }>);

        return Object.values(processedData).sort((a, b) => a.date.localeCompare(b.date));
    }, [allSalesData, dateFrom, dateTo, selectedBranch, selectedCashier]);


    const handleResetFilters = () => {
        setDateFrom(undefined);
        setDateTo(undefined);
        setSelectedBranch('all');
        setSelectedCashier('all');
    };

    return (
        <div className="space-y-6">
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
                <Button onClick={handleResetFilters} variant="outline" className="self-end">Reset Filters</Button>
            </div>

            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={filteredSalesData}
                        margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: `Sales (${currencySymbol})`, angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#8884d8" activeDot={{ r: 8 }} name="Total Sales" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}