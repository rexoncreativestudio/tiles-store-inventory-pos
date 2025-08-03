// src/app/dashboard/expenses/types.ts
import { z } from 'zod';

export type ExpenseCategoryForFilter = {
  id: string;
  name: string;
  description: string | null;
};

export type BranchForFilter = {
  id: string;
  name: string;
};

export type UserForFilter = {
  id: string;
  email: string;
};

export type ExpenseRecordForDisplay = {
  id: string;
  date: string; // TIMESTAMP WITH TIME ZONE
  expense_category_id: string;
  description: string | null; // Specific expense description
  amount: number; // Amount in FCFA
  vendor_notes: string | null; // Vendor name or specific notes
  branch_id: string; // Link to branch
  recorded_by_user_id: string; // User who recorded the expense
  created_at: string;
  updated_at: string;
  // Joined data (for display)
  expense_categories: { id: string; name: string; } | null;
  branches: { id: string; name: string; } | null;
  users: { id: string; email: string; } | null; // User who recorded the expense
};

// Zod schema for expense form validation
export const expenseFormSchema = z.object({
  id: z.string().optional(), // For editing existing records
  date: z.string().min(1, { message: "Date is required." }),
  expense_category_id: z.string().uuid({ message: "Expense category is required." }),
  description: z.string().optional(),
  amount: z.number().min(0.01, { message: "Amount must be greater than 0." }),
  vendor_notes: z.string().optional(),
  branch_id: z.string().uuid({ message: "Branch is required." }),
  recorded_by_user_id: z.string().uuid({ message: "Recorded by user is required." }),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;