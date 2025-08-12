"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase/client";

// Types
type ExpenseCategoryForPos = {
  id: string;
  name: string;
  description: string | null;
};
type BranchForFilter = { id: string; name: string };

export interface ExpenseRecordForPos {
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
}

interface AddPosExpenseModalClientProps {
  expenseCategories: ExpenseCategoryForPos[];
  branches: BranchForFilter[];
  currentCashierId: string;
  currentUserBranchId: string;
  currentUserRole: string;
  isOpen: boolean;
  onClose: () => void;
  onExpenseSubmitted: (expense: ExpenseRecordForPos) => void;
}

// Zod Schema (NO description)
const expenseFormSchema = z.object({
  expense_category_id: z.string().min(1, "Category is required"),
  branch_id: z.string().min(1, "Branch is required"),
  amount: z
    .number()
    .min(0.01, "Amount must be at least 0.01"),
  date: z.date(),
  vendor_notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function AddPosExpenseModalClient({
  expenseCategories,
  branches,
  currentCashierId,
  currentUserBranchId,
  currentUserRole,
  isOpen,
  onClose,
  onExpenseSubmitted,
}: AddPosExpenseModalClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role checks
  const canSelectBranch =
    ["admin", "general_manager", "branch_manager"].includes(currentUserRole);

  const isCashier = currentUserRole === "cashier";
  const miscellaneousCategory =
    isCashier
      ? expenseCategories.find((cat) => cat.name.toLowerCase() === "miscellaneous")
      : null;
  const miscellaneousCategoryId = miscellaneousCategory?.id ?? "";

  // Find current branch object (for label if needed)
  const currentBranch =
    branches.find((b) => b.id === currentUserBranchId) || null;

  // Always call hooks first!
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expense_category_id: isCashier ? miscellaneousCategoryId : "",
      branch_id: canSelectBranch ? "" : currentUserBranchId,
      amount: undefined,
      date: new Date(),
      vendor_notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        expense_category_id: isCashier ? miscellaneousCategoryId : "",
        branch_id: canSelectBranch ? "" : currentUserBranchId,
        amount: undefined,
        date: new Date(),
        vendor_notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, miscellaneousCategoryId, canSelectBranch, currentUserBranchId, isCashier]);

  // Block modal if cashier is missing category or branch
  if (
    isCashier &&
    (
      !miscellaneousCategoryId ||
      !currentUserBranchId ||
      !currentBranch
    ) &&
    isOpen
  ) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Cannot Add Expense</DialogTitle>
            <DialogDescription>
              { !miscellaneousCategoryId && (
                <>The &quot;Miscellaneous&quot; expense category is missing.<br /></>
              )}
              { (!currentUserBranchId || !currentBranch) && (
                <>Your branch information is missing.<br /></>
              )}
              Please contact your administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle submit
  const handleSubmit: SubmitHandler<ExpenseFormValues> = async (values) => {
    setIsSubmitting(true);

    // Guard: If cashier and category/branch is missing, block submit
    if (isCashier && (!miscellaneousCategoryId || !currentUserBranchId || !currentBranch)) {
      toast.error("Required category or branch is missing. Contact admin.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        date: values.date.toISOString(),
        expense_category_id: values.expense_category_id,
        amount: values.amount,
        vendor_notes: values.vendor_notes || null,
        branch_id: values.branch_id,
        recorded_by_user_id: currentCashierId,
      };

      const { data, error } = await supabaseClient
        .from("expenses")
        .insert([payload])
        .select(
          `id, date, expense_category_id, description, amount, vendor_notes, branch_id, recorded_by_user_id, created_at, updated_at,
          expense_categories(id, name), branches(id, name), users(id, email)`
        )
        .single();

      if (error) {
        throw error;
      }

      const formattedData: ExpenseRecordForPos = {
        ...data,
        expense_categories: Array.isArray(data.expense_categories)
          ? data.expense_categories[0]
          : data.expense_categories,
        branches: Array.isArray(data.branches)
          ? data.branches[0]
          : data.branches,
        users: Array.isArray(data.users)
          ? data.users[0]
          : data.users,
      };

      toast.success("Expense recorded successfully!");
      onExpenseSubmitted(formattedData);
      onClose();
    } catch {
      toast.error("Failed to record expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a new expense for your branch.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5 mt-1"
          onSubmit={form.handleSubmit(handleSubmit)}
          autoComplete="off"
        >
          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full h-11 justify-start text-left font-normal mt-1"
                  disabled={isSubmitting}
                  type="button"
                >
                  {form.watch("date")
                    ? format(form.watch("date"), "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("date")}
                  onSelect={(date) =>
                    form.setValue("date", date as Date, { shouldValidate: true })
                  }
                  initialFocus
                  disabled={isSubmitting}
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <span className="text-xs text-red-500">
                {form.formState.errors.date.message as string}
              </span>
            )}
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              type="number"
              id="amount"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="h-11 mt-1"
              {...form.register("amount", {
                valueAsNumber: true,
                required: true,
              })}
              disabled={isSubmitting}
            />
            {form.formState.errors.amount && (
              <span className="text-xs text-red-500">
                {form.formState.errors.amount.message}
              </span>
            )}
          </div>

          {/* Vendor Notes */}
          <div>
            <Label htmlFor="vendor_notes">Vendor/Notes</Label>
            <Input
              id="vendor_notes"
              placeholder="Vendor or note"
              className="h-11 mt-1"
              {...form.register("vendor_notes")}
              disabled={isSubmitting}
            />
          </div>

          {/* Expense Category */}
          <div>
            <Label htmlFor="expense_category_id">Expense Category</Label>
            {isCashier ? (
              <div className="h-11 flex items-center mt-1 rounded border px-3 bg-gray-50 text-muted-foreground">
                {miscellaneousCategory?.name || "Miscellaneous"}
              </div>
            ) : (
              <Select
                value={form.watch("expense_category_id")}
                onValueChange={(val) =>
                  form.setValue("expense_category_id", val, { shouldValidate: true })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full h-11 mt-1" id="expense_category_id">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.expense_category_id && (
              <span className="text-xs text-red-500">
                {form.formState.errors.expense_category_id.message}
              </span>
            )}
          </div>

          {/* Branch */}
          <div>
            <Label htmlFor="branch_id">Branch</Label>
            {isCashier ? (
              <div className="h-11 flex items-center mt-1 rounded border px-3 bg-gray-50 text-muted-foreground">
                {currentBranch?.name || "Unknown Branch"}
              </div>
            ) : (
              <Select
                value={form.watch("branch_id")}
                onValueChange={(val) =>
                  form.setValue("branch_id", val, { shouldValidate: true })
                }
                disabled={!canSelectBranch || isSubmitting}
              >
                <SelectTrigger className="w-full h-11 mt-1" id="branch_id">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.branch_id && (
              <span className="text-xs text-red-500">
                {form.formState.errors.branch_id.message}
              </span>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}   