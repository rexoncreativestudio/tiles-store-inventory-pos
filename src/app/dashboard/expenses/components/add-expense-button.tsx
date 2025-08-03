"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import ExpenseManagementActions from './expense-management-actions';

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

interface AddExpenseButtonProps {
    expenseCategories: ExpenseCategoryForFilter[];
    branches: BranchForFilter[];
    users: UserForFilter[];
    currentUserId: string;
}

export default function AddExpenseButton({ expenseCategories, branches, users, currentUserId }: AddExpenseButtonProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleExpenseSubmitted = () => {
        setIsOpen(false);
        router.refresh(); // Refresh data on the parent page
    };

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
            </Button>
            <ExpenseManagementActions
                expenseToEdit={undefined}
                expenseCategories={expenseCategories}
                branches={branches}
                users={users}
                currentUserId={currentUserId}
                onExpenseSubmitted={handleExpenseSubmitted} // FIX: pass this prop
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}