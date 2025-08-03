"use client";

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrencyFormatter } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Search, Eye, Pencil, Trash2, CalendarIcon, DollarSign, Users, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import ExpenseManagementActions from './expense-management-actions';
import Pagination from '@/components/ui/pagination';
import { ExpenseCategoryForFilter, BranchForFilter, UserForFilter, ExpenseRecordForDisplay } from '../types';

interface ExpenseOverviewClientProps {
  initialExpenses: ExpenseRecordForDisplay[];
  initialExpenseCategories: ExpenseCategoryForFilter[];
  initialBranches: BranchForFilter[];
  initialUsers: UserForFilter[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  currentUserId: string;
}

export default function ExpenseOverviewClient({
  initialExpenses,
  initialExpenseCategories,
  initialBranches,
  initialUsers,
  totalItems,
  currentPage,
  itemsPerPage,
  currentUserId,
}: ExpenseOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatCurrency } = useCurrencyFormatter();

  const [expenseSearchQuery, setExpenseSearchQuery] = useState<string>(searchParams.get('query') || '');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(searchParams.get('category') || 'all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(searchParams.get('branch') || 'all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(searchParams.get('user') || 'all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(searchParams.get('dateFrom') ? parseISO(searchParams.get('dateFrom')!) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(searchParams.get('dateTo') ? parseISO(searchParams.get('dateTo')!) : undefined);

  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecordForDisplay | null>(null);

  // State for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<ExpenseRecordForDisplay | undefined>(undefined);

  // State for delete confirmation dialog
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Function to apply filters by updating URL search parameters
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (expenseSearchQuery) params.set('query', expenseSearchQuery);
    if (selectedCategoryFilter !== 'all') params.set('category', selectedCategoryFilter);
    if (selectedBranchFilter !== 'all') params.set('branch', selectedBranchFilter);
    if (selectedUserFilter !== 'all') params.set('user', selectedUserFilter);
    if (dateFrom) params.set('dateFrom', dateFrom.toISOString());
    if (dateTo) params.set('dateTo', dateTo.toISOString());
    params.set('page', '1'); // Reset to first page on filter apply
    router.push(`/dashboard/expenses?${params.toString()}`);
  };

  // Function to reset filters
  const resetFilters = () => {
    setExpenseSearchQuery('');
    setSelectedCategoryFilter('all');
    setSelectedBranchFilter('all');
    setSelectedUserFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    router.push('/dashboard/expenses');
  };

  // Handle page change for pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/dashboard/expenses?${params.toString()}`);
  };

  const handleViewDetails = (expense: ExpenseRecordForDisplay) => {
    setSelectedExpense(expense);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditExpense = (expense: ExpenseRecordForDisplay) => {
    setSelectedExpenseForEdit(expense);
    setIsEditModalOpen(true);
  };

  // Function to open delete confirmation dialog
  const openDeleteConfirmDialog = (expenseId: string) => {
    setExpenseToDeleteId(expenseId);
    setIsDeleteConfirmDialogOpen(true);
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDeleteId) return;
    setIsDeleting(true);

    const { error } = await supabaseClient
      .from('expenses')
      .delete()
      .eq('id', expenseToDeleteId);

    if (error) {
      toast.error("Failed to delete expense.", { description: error.message });
      console.error("Delete expense error:", error);
    } else {
      toast.success("Expense deleted successfully!");
      handleCloseModals();
      router.refresh();
    }
    setIsDeleting(false);
  };

  const handleCloseModals = () => {
    setIsViewDetailsDialogOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteConfirmDialogOpen(false);
    setSelectedExpense(null);
    setSelectedExpenseForEdit(undefined);
    setExpenseToDeleteId(null);
  };

  const handleExpenseSubmitted = () => {
    handleCloseModals();
    router.refresh();
  };

  // Summary calculations for filtered expenses
  const totalExpensesAmount = useMemo(() => {
    return initialExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [initialExpenses]);

  // Branch Total Expenses Cards
  const branchTotalExpenses = useMemo(() => {
    const branchSums: { [key: string]: number } = {};
    initialExpenses.forEach(expense => {
      const branchName = expense.branches?.name || 'Unknown Branch';
      branchSums[branchName] = (branchSums[branchName] || 0) + expense.amount;
    });
    return branchSums;
  }, [initialExpenses]);

  // Prepare a sorted list of branches with their totals for dynamic card rendering
  const branchesWithExpenseTotals = useMemo(() => {
    return initialBranches.map(branch => {
      const totalAmount = branchTotalExpenses[branch.name] || 0;
      return {
        id: branch.id,
        name: branch.name,
        totalAmount: totalAmount,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [initialBranches, branchTotalExpenses]);

  return (
    <div className="space-y-6">
      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex-grow relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by description, vendor, category, or user..."
            className="pl-10 w-full"
            value={expenseSearchQuery}
            onChange={(e) => setExpenseSearchQuery(e.target.value)}
          />
        </div>

        <Select onValueChange={setSelectedCategoryFilter} value={selectedCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {initialExpenseCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setSelectedBranchFilter} value={selectedBranchFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {initialBranches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setSelectedUserFilter} value={selectedUserFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {initialUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full sm:w-[240px] justify-start text-left font-normal",
                (!dateFrom && !dateTo) && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? (
                dateTo ? `${format(dateFrom, "PPP")} - ${format(dateTo, "PPP")}` : format(dateFrom, "PPP")
              ) : (
                <span>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateFrom, to: dateTo }}
              onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                setDateFrom(range?.from);
                setDateTo(range?.to);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        
        <Button onClick={applyFilters} className="self-end">Apply Filters</Button>
        <Button variant="outline" onClick={resetFilters} className="self-end">Reset Filters</Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpensesAmount)}</div>
            <p className="text-xs text-muted-foreground">Total amount spent (filtered)</p>
          </CardContent>
        </Card>
        {branchesWithExpenseTotals.map(branch => (
          <Card key={branch.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{branch.name} Expenses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(branch.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">Total for this branch (filtered)</p>
            </CardContent>
          </Card>
        ))}
        {initialBranches.length === 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Branch Expenses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpensesAmount)}</div>
              <p className="text-xs text-muted-foreground">Overall across branches (filtered)</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>All recorded business expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%]">SN</TableHead>
                <TableHead className="w-[12%]">Date</TableHead>
                <TableHead className="w-[15%]">Category</TableHead>
                <TableHead className="w-[20%]">Description</TableHead>
                <TableHead className="w-[15%]">Vendor/Notes</TableHead>
                <TableHead className="w-[10%]">Branch</TableHead>
                <TableHead className="w-[10%]">Recorded By</TableHead>
                <TableHead className="w-[10%] text-right">Amount</TableHead>
                <TableHead className="w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialExpenses && initialExpenses.length > 0 ? (
                initialExpenses.map((expense, idx) => (
                  <TableRow key={expense.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{format(parseISO(expense.date), 'PPP')}</TableCell>
                    <TableCell>{expense.expense_categories?.name || 'N/A'}</TableCell>
                    <TableCell>{expense.description || 'N/A'}</TableCell>
                    <TableCell>{expense.vendor_notes || 'N/A'}</TableCell>
                    <TableCell>{expense.branches?.name || 'N/A'}</TableCell>
                    <TableCell>{expense.users?.email || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-right flex space-x-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(expense)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditExpense(expense)} title="Edit Expense">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteConfirmDialog(expense.id)} title="Delete Expense">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No expense records found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Component */}
      <Pagination
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>Details for expense record: {selectedExpense?.id}</DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="grid gap-4 py-4 text-sm">
              <p><strong>Date:</strong> {format(parseISO(selectedExpense.date), 'PPP')}</p>
              <p><strong>Category:</strong> {selectedExpense.expense_categories?.name || 'N/A'}</p>
              <p><strong>Description:</strong> {selectedExpense.description || 'N/A'}</p>
              <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount)}</p>
              <p><strong>Vendor/Notes:</strong> {selectedExpense.vendor_notes || 'N/A'}</p>
              <p><strong>Branch:</strong> {selectedExpense.branches?.name || 'N/A'}</p>
              <p><strong>Recorded By:</strong> {selectedExpense.users?.email || 'N/A'}</p>
              <p><strong>Created At:</strong> {format(parseISO(selectedExpense.created_at), 'PPP p')}</p>
              <p><strong>Last Updated:</strong> {format(parseISO(selectedExpense.updated_at), 'PPP p')}</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCloseModals}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense record (ID: {expenseToDeleteId})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModals} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Management Actions Dialog (for Add/Edit functionality) */}
      <ExpenseManagementActions
        expenseToEdit={selectedExpenseForEdit}
        expenseCategories={initialExpenseCategories}
        branches={initialBranches}
        users={initialUsers}
        currentUserId={currentUserId}
        onExpenseSubmitted={handleExpenseSubmitted}
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
      />
    </div>
  );
} 