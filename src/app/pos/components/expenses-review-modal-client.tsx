"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCurrencyFormatter } from "@/lib/formatters";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DollarSign, ReceiptText, CalendarIcon, Plus } from "lucide-react";
import AddPosExpenseModalClient from "./add-pos-expense-modal-client";
import { toast } from "sonner";

// --- Type Definitions (import from ../types if needed) ---
type ExpenseCategoryForPos = {
  id: string;
  name: string;
  description: string | null;
};

type ExpenseRecordForPos = {
  id: string;
  date: string;
  expense_category_id: string;
  description: string | null;
  amount: number;
  vendor_notes: string | null;
  branch_id: string;
  recorded_by_user_id: string;
  created_at: string;
  updated_at: string;
  expense_categories: { id: string; name: string } | null;
  branches: { id: string; name: string } | null;
  users: { id: string; email: string } | null;
};

type BranchForFilter = { id: string; name: string };

interface ExpensesReviewModalClientProps {
  initialExpenses: ExpenseRecordForPos[];
  initialExpenseCategories: ExpenseCategoryForPos[];
  currentCashierId: string;
  isOpen: boolean;
  onClose: () => void;
  branches: BranchForFilter[];
  currentUserBranchId: string;
  currentUserRole: string;
  onExpenseSubmitted?: () => void;
}

// --- Excluded categories for filter ---
const excludedCategories = [
  "Warehouse Rent",
  "Repairs & Maintenance",
  "Staff Salaries",
  "Rent",
  "Advertising & Marketing",
];

export default function ExpensesReviewModalClient({
  initialExpenses,
  initialExpenseCategories,
  currentCashierId,
  isOpen,
  onClose,
  branches,
  currentUserBranchId,
  currentUserRole,
  onExpenseSubmitted,
}: ExpensesReviewModalClientProps) {
  const { formatCurrency } = useCurrencyFormatter();

  // --- Filters ---
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // --- Add Expense Modal State ---
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);

  // --- Details Dialog State ---
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedExpenseDetails, setSelectedExpenseDetails] =
    useState<ExpenseRecordForPos | null>(null);

  // --- Local copy of expenses for live updates ---
  const [expenses, setExpenses] = useState<ExpenseRecordForPos[]>(initialExpenses);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  // --- Filtered Expense Categories (dropdown) ---
  const filteredExpenseCategories = useMemo(
    () =>
      initialExpenseCategories.filter(
        (cat) => !excludedCategories.includes(cat.name)
      ),
    [initialExpenseCategories]
  );

  // --- Filtered Expenses (all filters applied) ---
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (dateFrom && dateTo) {
      filtered = filtered.filter((expense) => {
        // Defensive: if expense.date is a Date, convert to ISO string
        const dateStr =
          typeof expense.date === "string"
            ? expense.date
            : (expense.date as unknown as Date).toISOString();
        const expenseDate = parseISO(dateStr);
        return isWithinInterval(expenseDate, { start: dateFrom, end: dateTo });
      });
    }
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (expense) =>
          expense.vendor_notes?.toLowerCase().includes(lowerCaseQuery) ||
          expense.expense_categories?.name?.toLowerCase().includes(lowerCaseQuery)
      );
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (expense) => expense.expense_category_id === selectedCategory
      );
    }
    return filtered;
  }, [expenses, dateFrom, dateTo, searchQuery, selectedCategory]);

  // --- Summary Data ---
  const totalExpensesAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );
  const numberOfExpenses = filteredExpenses.length;

  const handleResetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setSelectedCategory("all");
  };

  // When a new expense is submitted, add it to the table immediately
  const handleExpenseSubmitted = (newExpense: ExpenseRecordForPos) => {
    setIsAddExpenseDialogOpen(false);
    if (newExpense) {
      setExpenses((prev) => [newExpense, ...prev]);
    }
    if (onExpenseSubmitted) onExpenseSubmitted();
    toast.success("Expense added!");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">Expenses Review</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Review, filter, and add expenses.
            </DialogDescription>
          </DialogHeader>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="rounded-xl shadow border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold">
                  {formatCurrency(totalExpensesAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total amount (filtered)
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Number of Expenses</CardTitle>
                <ReceiptText className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold">{numberOfExpenses}</div>
                <p className="text-xs text-muted-foreground">
                  Total expense records (filtered)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="w-full flex flex-wrap items-end gap-4 mb-6">
            <div className="grid gap-1 flex-grow min-w-[180px]">
              <Label htmlFor="search_expenses" className="font-semibold">
                Search
              </Label>
              <Input
                id="search_expenses"
                placeholder="Vendor, Category"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="date_from_expenses" className="font-semibold">
                Date From
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[170px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
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
            <div className="grid gap-1">
              <Label htmlFor="date_to_expenses" className="font-semibold">
                Date To
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[170px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
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
            <div className="grid gap-1 min-w-[180px]">
              <Label htmlFor="category_expenses_filter" className="font-semibold">
                Category
              </Label>
              <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                <SelectTrigger className="w-[180px] h-11" id="category_expenses_filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filteredExpenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="self-end h-11"
            >
              Reset Filters
            </Button>
            <Button
              variant="ghost"
              className="self-end h-11 rounded-lg flex gap-2 items-center font-semibold text-base px-6"
              onClick={() => setIsAddExpenseDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Add New Expense
            </Button>
          </div>

          {/* Expenses Table */}
          <div className="w-full pb-8" style={{ maxHeight: "48vh", overflowY: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[180px]">Category</TableHead>
                  <TableHead className="w-[180px]">Branch</TableHead>
                  <TableHead className="w-[340px]">Vendor/Notes</TableHead>
                  <TableHead className="text-right w-[120px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense, idx) => {
                    // Defensive: ensure date is always an ISO string
                    const dateStr =
                      typeof expense.date === "string"
                        ? expense.date
                        : (expense.date as unknown as Date).toISOString();
                    return (
                      <TableRow
                        key={expense.id}
                        onClick={() => {
                          setSelectedExpenseDetails(expense);
                          setIsViewDetailsDialogOpen(true);
                        }}
                        className="cursor-pointer hover:bg-blue-50 transition"
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{format(parseISO(dateStr), "PPP")}</TableCell>
                        <TableCell>{expense.expense_categories?.name || "N/A"}</TableCell>
                        <TableCell>{expense.branches?.name || "N/A"}</TableCell>
                        <TableCell>
                          <div
                            className="truncate max-w-[320px] font-mono text-base"
                            title={expense.vendor_notes || "N/A"}
                          >
                            {expense.vendor_notes || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No expenses found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Details Dialog */}
      <Dialog
        open={isViewDetailsDialogOpen}
        onOpenChange={setIsViewDetailsDialogOpen}
      >
        <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Expense Details</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Details for expense record.
            </DialogDescription>
          </DialogHeader>
          {selectedExpenseDetails && (
            <div className="grid gap-6 py-4 text-base">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <p>
                  <strong>Date:</strong>{" "}
                  {format(
                    parseISO(
                      typeof selectedExpenseDetails.date === "string"
                        ? selectedExpenseDetails.date
                        : (selectedExpenseDetails.date as unknown as Date).toISOString()
                    ),
                    "PPP"
                  )}
                </p>
                <p>
                  <strong>Category:</strong> {selectedExpenseDetails.expense_categories?.name || "N/A"}
                </p>
                <p>
                  <strong>Branch:</strong> {selectedExpenseDetails.branches?.name || "N/A"}
                </p>
                <p>
                  <strong>Amount:</strong>{" "}
                  <span className="font-semibold">
                    {formatCurrency(selectedExpenseDetails.amount)}
                  </span>
                </p>
                <p>
                  <strong>Recorded By:</strong> {selectedExpenseDetails.users?.email || "N/A"}
                </p>
                <p>
                  <strong>Created At:</strong>{" "}
                  {format(parseISO(selectedExpenseDetails.created_at), "PPP p")}
                </p>
                <p>
                  <strong>Last Updated:</strong>{" "}
                  {format(parseISO(selectedExpenseDetails.updated_at), "PPP p")}
                </p>
                <p className="md:col-span-2">
                  <strong>Vendor/Notes:</strong>{" "}
                  <span className="font-mono">{selectedExpenseDetails.vendor_notes || "N/A"}</span>
                </p>
              </div>
              {selectedExpenseDetails.description && (
                <div className="mt-4">
                  <strong>Description:</strong>
                  <div className="mt-1 bg-gray-50 p-3 rounded text-muted-foreground min-h-[32px]">
                    {selectedExpenseDetails.description}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDetailsDialogOpen(false)} className="mt-4">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <AddPosExpenseModalClient
        expenseCategories={initialExpenseCategories}
        branches={branches}
        currentCashierId={currentCashierId}
        currentUserBranchId={currentUserBranchId}
        currentUserRole={currentUserRole}
        isOpen={isAddExpenseDialogOpen}
        onClose={() => setIsAddExpenseDialogOpen(false)}
        onExpenseSubmitted={handleExpenseSubmitted}
      />
    </>
  );
}