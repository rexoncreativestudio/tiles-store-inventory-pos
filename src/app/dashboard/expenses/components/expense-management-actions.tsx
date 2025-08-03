"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react'; // Only Loader2 is used
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form"; // Remove Controller
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from 'date-fns';

// --- Type Definitions (from ../types.ts) ---
type ExpenseCategoryForFilter = {
  id: string;
  name: string;
  description: string | null;
};

type BranchForFilter = {
  id: string;
  name: string;
};

type UserForFilter = {
  id: string;
  email: string;
};

type ExpenseRecordForDisplay = {
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
  expense_categories: { id: string; name: string; } | null;
  branches: { id: string; name: string; } | null;
  users: { id: string; email: string; } | null;
};

// Zod schema for expense form validation
const expenseFormSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, { message: "Date is required." }),
  expense_category_id: z.string().uuid({ message: "Expense category is required." }),
  amount: z.number().min(0.01, { message: "Amount must be greater than 0." }),
  vendor_notes: z.string().optional(),
  branch_id: z.string().uuid({ message: "Branch is required." }),
  recorded_by_user_id: z.string().uuid({ message: "Recorded by user is required." }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseManagementActionsProps {
  expenseToEdit?: ExpenseRecordForDisplay;
  expenseCategories: ExpenseCategoryForFilter[];
  branches: BranchForFilter[];
  users: UserForFilter[];
  currentUserId: string;
  onExpenseSubmitted: () => void; // <- required and USED
  isOpen?: boolean;
  onClose?: () => void;
}

function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return '';
  const date = parseISO(isoString);
  if (isNaN(date.getTime())) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export default function ExpenseManagementActions({
  expenseToEdit,
  expenseCategories,
  branches,
  users,
  currentUserId,
  onExpenseSubmitted,
  isOpen = false,
  onClose = () => {},
}: ExpenseManagementActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      id: undefined,
      date: toDatetimeLocal(new Date().toISOString()),
      expense_category_id: '',
      amount: 0,
      vendor_notes: '',
      branch_id: '',
      recorded_by_user_id: currentUserId,
    },
  });

  const watchedCategoryId = form.watch("expense_category_id");
  const selectedCategoryDescription = useMemo(() => {
    return expenseCategories.find(cat => cat.id === watchedCategoryId)?.description || 'No description available for this category.';
  }, [watchedCategoryId, expenseCategories]);

  useEffect(() => {
    if (isOpen) {
      form.reset(expenseToEdit ? {
        id: expenseToEdit.id,
        date: toDatetimeLocal(expenseToEdit.date),
        expense_category_id: expenseToEdit.expense_category_id,
        amount: expenseToEdit.amount,
        vendor_notes: expenseToEdit.vendor_notes || '',
        branch_id: expenseToEdit.branch_id,
        recorded_by_user_id: expenseToEdit.recorded_by_user_id,
      } : {
        id: undefined,
        date: toDatetimeLocal(new Date().toISOString()),
        expense_category_id: '',
        amount: 0,
        vendor_notes: '',
        branch_id: '',
        recorded_by_user_id: currentUserId,
      });
      form.clearErrors();
    }
  }, [isOpen, expenseToEdit, form, currentUserId]);

  const onSubmit: SubmitHandler<ExpenseFormValues> = async (values) => {
    setIsLoading(true);
    let error = null;

    const payload = {
      date: values.date,
      expense_category_id: values.expense_category_id,
      description: selectedCategoryDescription,
      amount: values.amount,
      vendor_notes: values.vendor_notes || null,
      branch_id: values.branch_id,
      recorded_by_user_id: values.recorded_by_user_id,
    };

    if (expenseToEdit) {
      const { error: dbUpdateError } = await supabaseClient
        .from('expenses')
        .update(payload)
        .eq('id', expenseToEdit.id);
      error = dbUpdateError;
    } else {
      const { error: dbInsertError } = await supabaseClient
        .from('expenses')
        .insert(payload);
      error = dbInsertError;
    }

    if (error) {
      toast.error(`Failed to ${expenseToEdit ? 'update' : 'add'} expense.`, { description: error.message });
    } else {
      toast.success(`Expense ${expenseToEdit ? 'updated' : 'added'} successfully!`);
      onExpenseSubmitted(); // Notify parent!
      onClose();
      router.refresh();
    }
    setIsLoading(false);
  };

  const isNewExpense = !expenseToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNewExpense ? "Add New Expense" : `Edit Expense: ${expenseToEdit?.description || expenseToEdit?.id}`}</DialogTitle>
          <DialogDescription>
            {isNewExpense ? "Enter details for the new expense record." : "Make changes to the expense details here."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* ...form fields unchanged... */}
          {/* Keep the rest of your form fields as before */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="datetime-local"
                {...form.register("date")}
                disabled={isLoading}
              />
              {form.formState.errors.date && <p className="text-red-500 text-sm mt-1">{form.formState.errors.date.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (FCFA)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("amount", { valueAsNumber: true })}
                disabled={isLoading}
              />
              {form.formState.errors.amount && <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expense_category_id">Expense Category</Label>
            <Select
              onValueChange={(value) => form.setValue("expense_category_id", value, { shouldValidate: true })}
              value={form.watch("expense_category_id") || ''}
              disabled={isLoading}
            >
              <SelectTrigger id="expense_category_id">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.expense_category_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.expense_category_id.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Category Description</Label>
            <Textarea
              id="description"
              value={selectedCategoryDescription}
              disabled
              placeholder="Description loads from selected category"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vendor_notes">Vendor / Notes (Optional)</Label>
            <Textarea
              id="vendor_notes"
              placeholder="e.g., ENEO + CamWater, Technician paid on site"
              {...form.register("vendor_notes")}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="branch_id">Branch</Label>
              <Select
                onValueChange={(value) => form.setValue("branch_id", value, { shouldValidate: true })}
                value={form.watch("branch_id") || ''}
                disabled={isLoading}
              >
                <SelectTrigger id="branch_id">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.branch_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.branch_id.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recorded_by_user_id">Recorded By</Label>
              <Select
                onValueChange={(value) => form.setValue("recorded_by_user_id", value, { shouldValidate: true })}
                value={form.watch("recorded_by_user_id") || ''}
                disabled={isLoading}
              >
                <SelectTrigger id="recorded_by_user_id">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent> 
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.recorded_by_user_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.recorded_by_user_id.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}