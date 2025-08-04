import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import ExpenseOverviewClient from './components/expense-overview-client';
import AddExpenseButton from './components/add-expense-button';

// --- Type Definitions (aligned with DB schema and for client components) ---
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
  // Joined data
  expense_categories: { id: string; name: string; } | null;
  branches: { id: string; name: string; } | null;
  users: { id: string; email: string; } | null;
};

export default async function ExpensesPage({
  // Changed the type of searchParams to `any` to resolve the build error.
  // Next.js 15.x.x's internal type checking for PageProps is causing a conflict.
  searchParams,
}: any) { // Changed from `{ searchParams?: { ... } }` to `any`
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('id, role, branch_id, email')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager', 'cashier'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Expenses.");
    redirect('/dashboard/overview');
  }

  const currentUserId = currentUserProfile.id;
  const currentUserRole = currentUserProfile.role;
  const currentUserBranchId = currentUserProfile.branch_id;

  // Pagination parameters
  const currentPage = parseInt(searchParams?.page || '1');
  const itemsPerPage = parseInt(searchParams?.limit || '10');
  const offset = (currentPage - 1) * itemsPerPage;

  // Build Supabase query for expenses
  let expensesQuery = supabase
    .from('expenses')
    .select(`
      id, date, expense_category_id, description, amount, vendor_notes, branch_id, recorded_by_user_id, created_at, updated_at,
      expense_categories(id, name),
      branches(id, name),
      users(id, email)
    `, { count: 'exact' })
    .order('date', { ascending: false });

  // Apply role-based access filtering (server-side RLS also applies, but this pre-filters)
  if (currentUserRole === 'branch_manager' && currentUserBranchId) {
    expensesQuery = expensesQuery.eq('branch_id', currentUserBranchId);
  } else if (currentUserRole === 'cashier') {
    expensesQuery = expensesQuery.eq('recorded_by_user_id', currentUserId);
  }

  // Apply filters from searchParams
  if (searchParams?.query) {
    const searchTerm = `%${searchParams.query.toLowerCase()}%`;
    expensesQuery = expensesQuery.or(
      `description.ilike.${searchTerm},vendor_notes.ilike.${searchTerm},expense_categories.name.ilike.${searchTerm},branches.name.ilike.${searchTerm},users.email.ilike.${searchTerm}`
    );
  }
  if (searchParams?.category && searchParams.category !== 'all') {
    expensesQuery = expensesQuery.eq('expense_category_id', searchParams.category);
  }
  if (searchParams?.branch && searchParams.branch !== 'all') {
    expensesQuery = expensesQuery.eq('branch_id', searchParams.branch);
  }
  if (searchParams?.user && searchParams.user !== 'all') {
    expensesQuery = expensesQuery.eq('recorded_by_user_id', searchParams.user);
  }
  if (searchParams?.dateFrom) {
    expensesQuery = expensesQuery.gte('date', searchParams.dateFrom);
  }
  if (searchParams?.dateTo) {
    expensesQuery = expensesQuery.lte('date', searchParams.dateTo);
  }

  // Apply pagination range AFTER filters
  const { data: expenses, error: expensesError, count: totalExpenseCount } = await expensesQuery
    .range(offset, offset + itemsPerPage - 1)
    .returns<ExpenseRecordForDisplay[]>();

  if (expensesError) {
    console.error("Error fetching expenses:", expensesError.message);
  }

  // Fetch all categories for filter dropdown and form
  const { data: expenseCategories, error: categoriesError } = await supabase
    .from('expense_categories')
    .select('id, name, description')
    .order('name', { ascending: true })
    .returns<ExpenseCategoryForFilter[]>();
  if (categoriesError) console.error("Error fetching expense categories:", categoriesError.message);

  // Fetch all branches for filter dropdown and form (if user is admin/general_manager)
  let branchesForFilter: BranchForFilter[] = [];
  if (currentUserRole === 'admin' || currentUserRole === 'general_manager') {
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true })
      .returns<BranchForFilter[]>();
    if (branchesError) console.error("Error fetching branches for filter:", branchesError.message);
    branchesForFilter = branches || [];
  } else if (currentUserBranchId) {
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', currentUserBranchId)
      .single()
      .returns<BranchForFilter>();
    if (branchError) console.error("Error fetching current branch for filter:", branchError.message);
    if (branch) branchesForFilter = [branch];
  }

  // Fetch all users (cashiers/managers) for filter dropdown and form
  let usersForFilter: UserForFilter[] = [];
  if (currentUserRole === 'admin' || currentUserRole === 'general_manager' || currentUserRole === 'branch_manager') {
    let usersQuery = supabase
      .from('users')
      .select('id, email')
      .in('role', ['admin', 'general_manager', 'branch_manager', 'cashier'])
      .order('email', { ascending: true });

    if (currentUserRole === 'branch_manager' && currentUserBranchId) {
      usersQuery = usersQuery.eq('branch_id', currentUserBranchId);
    }
    const { data: users, error: usersError } = await usersQuery.returns<UserForFilter[]>();
    if (usersError) console.error("Error fetching users for filter:", usersError.message);
    usersForFilter = users || [];
  } else if (currentUserRole === 'cashier') {
    usersForFilter = [{ id: currentUserId, email: currentUserProfile.email || 'You' }];
  }

  return (
    <div className="p-8">
      {/* --- Title & Add Section --- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expenses Management</h1>
        <AddExpenseButton
          expenseCategories={expenseCategories || []}
          branches={branchesForFilter || []}
          users={usersForFilter || []}
          currentUserId={currentUserId}
        />
      </div>
      {/* --- Main Content Container --- */}
      <div className="bg-white rounded-lg shadow-md px-8 py-8">
        {/* --- Filters Section above summary --- */}
        <div className="mb-8">
          {/* Place your filter component here, if you have one (e.g., <ExpenseFilterActions />), pass all needed props */}
          {/* Example: */}
          {/* <ExpenseFilterActions
            expenseCategories={expenseCategories || []}
            branches={branchesForFilter || []}
            users={usersForFilter || []}
            searchParams={searchParams || {}}
          /> */}
        </div>
        {/* --- Overview/Summary Section --- */}
        <ExpenseOverviewClient
          initialExpenses={expenses || []}
          initialExpenseCategories={expenseCategories || []}
          initialBranches={branchesForFilter || []}
          initialUsers={usersForFilter || []}
          totalItems={totalExpenseCount || 0}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
 