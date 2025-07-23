// src/app/dashboard/sales/sales-filter-actions.tsx
"use client";

import React, { useState } from 'react'; // Added useState
import { Button } from '@/components/ui/button';
// Removed Input import, as it's not used in this file
// import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns"; // Added format import for date display
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

// Re-define types for clarity and to be self-contained
type SaleItemDetails = {
    id: string;
    product_id: string;
    quantity: number;
    unit_sale_price: number;
    total_price: number;
    note: string | null;
    products: {
      id: string;
      name: string;
      unique_reference: string;
    } | null;
  };

type SaleRecord = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'held' | 'cancelled';
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    email: string;
  } | null;
  branches: {
    id: string;
    name: string;
  } | null;
  sale_items: SaleItemDetails[];
};

type UserForSelect = {
  id: string;
  email: string;
};

type BranchForSelect = {
  id: string;
  name: string;
};

interface SalesFilterActionsProps {
  cashiers: UserForSelect[];
  branches: BranchForSelect[];
  initialSales: SaleRecord[]; // The sales data fetched server-side
}

export default function SalesFilterActions({ cashiers, branches}: SalesFilterActionsProps) {
  // State for date filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  // State for other filters will go here (cashier, branch, status)
  // These initialSales are not used directly for filtering in this component right now,
  // but they are received for future client-side filtering implementation.

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      {/* Date Range Filter (From) */}
      <div className="grid gap-1">
        <Label htmlFor="date_from">Date From</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground" // Correct check for falsy value
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>} {/* Use format for date display */}
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

      {/* Date Range Filter (To) */}
      <div className="grid gap-1">
        <Label htmlFor="date_to">Date To</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !dateTo && "text-muted-foreground" // Correct check for falsy value
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

      {/* Cashier Filter */}
      <div className="grid gap-1">
        <Label htmlFor="cashier_filter">Cashier</Label>
        <Select>
          <SelectTrigger className="w-[180px]" id="cashier_filter">
            <SelectValue placeholder="All Cashiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cashiers</SelectItem>
            {cashiers.map(cashier => (
              <SelectItem key={cashier.id} value={cashier.id}>{cashier.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branch Filter */}
      <div className="grid gap-1">
        <Label htmlFor="branch_filter">Branch</Label>
        <Select>
          <SelectTrigger className="w-[180px]" id="branch_filter">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="grid gap-1">
        <Label htmlFor="status_filter">Status</Label>
        <Select>
          <SelectTrigger className="w-[180px]" id="status_filter">
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

      <Button className="self-end">Apply Filters</Button>
      <Button variant="outline" className="self-end">Reset Filters</Button>
    </div>
  );
}