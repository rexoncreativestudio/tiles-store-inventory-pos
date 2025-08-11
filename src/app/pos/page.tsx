export const runtime = 'nodejs';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PosInterfaceClient from './pos-interface-client';
import {
  CategoryForPos,
  ProductForPos,
  ProductStockDetail,
  SaleRecordForRecentSales,
  SaleItemDetailsForRecentSales,
  ExpenseCategoryForPos,
  ExpenseRecordForPos,
  BranchForFilter,
} from './types';

// --- Types for external sale mapping ---
type ExternalSaleRecordFromSupabase = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: "completed" | "held" | "cancelled" | "pending_approval";
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: { id: string; email: string; role?: string }[] | null;
  branches: { id: string; name: string }[] | null;
  external_sale_items: SaleItemDetailsForRecentSales[];
};

export default async function PosPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // --- Auth check ---
  if (!user) {
    redirect('/');
  }

  // --- User profile & branch ---
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, branch_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.branch_id) {
    console.error("Profile or branch_id not found:", profileError?.message);
    redirect('/login');
  }

  const normalizedRole = (profile.role || "")
    .replace(/[_\s]/g, "")
    .toLowerCase();

  const allowedRoles = [
    "cashier",
    "admin",
    "generalmanager",
    "branchmanager",
    "general_manager",
    "branch_manager"
  ];
  if (!allowedRoles.includes(normalizedRole)) {
    redirect('/dashboard/overview');
  }

  const currentUserId = profile.id;
  const currentUserBranchId = profile.branch_id;
  const currentUserRole = profile.role;

  // --- Branch list for filter/selection ---
  let allBranches: BranchForFilter[] = [];
  if (
    currentUserRole === 'admin' ||
    currentUserRole === 'general_manager' ||
    currentUserRole === 'branch_manager'
  ) {
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true });

    if (branchesError) {
      console.error("Error fetching branches for POS:", branchesError.message);
    }
    allBranches = branches || [];
  } else {
    // Cashier: only own branch
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', currentUserBranchId)
      .single();
    if (branchError) {
      console.error("Error fetching cashier's branch for POS:", branchError.message);
    }
    allBranches = branch ? [branch] : [];
  }

  // --- Products ---
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, unique_reference, name, image_url, sale_price, low_stock_threshold, category_id')
    .order('name', { ascending: true })
    .returns<ProductForPos[]>();

  if (productsError) {
    console.error("Error fetching products for POS:", productsError.message);
  }

  // --- Stock ---
  const { data: stockDetails, error: stockError } = await supabase
    .from('stock')
    .select('product_id, quantity, warehouse_id, warehouses(id, name)')
    .returns<ProductStockDetail[]>();

  if (stockError) {
    console.error("Error fetching stock details for POS:", stockError.message);
  }

  // --- Categories ---
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, unit_abbreviation')
    .returns<CategoryForPos[]>();

  if (categoriesError) {
    console.error("Error fetching categories for POS:", categoriesError.message);
  }

  // --- Recent Sales (Normal) ---
  const { data: recentSalesData, error: recentSalesError } = await supabase
    .from('sales')
    .select(`id, sale_date, cashier_id, branch_id, customer_name, customer_phone, total_amount, payment_method, status, transaction_reference, created_at, updated_at,
      users(id, email, role),
      branches(id, name),
      sale_items(
        id, product_id, quantity, unit_sale_price, total_price, note,
        products(id, name, unique_reference, product_unit_abbreviation, purchase_price)
      )
    `)
    .order('sale_date', { ascending: false })
    .limit(50)
    .returns<SaleRecordForRecentSales[]>();

  if (recentSalesError) {
    console.error("Error fetching recent sales for modal:", recentSalesError.message);
  }

  // --- External Sales (explicit join for cashier_id) ---
  const { data: externalSalesData, error: externalSalesError } = await supabase
    .from('external_sales')
    .select(`
      id, sale_date, cashier_id, branch_id, customer_name, customer_phone, total_amount, payment_method, status, transaction_reference, created_at, updated_at,
      users!cashier_id(id, email, role),
      branches(id, name),
      external_sale_items(id, product_name, product_category_name, product_unit_name, quantity, unit_sale_price, unit_purchase_price_negotiated, total_cost, total_price, note)
    `)
    .order('sale_date', { ascending: false })
    .limit(50);

  if (externalSalesError) {
    console.error("Error fetching external sales for modal:", externalSalesError.message);
  }

  // --- Format & Merge Sales (filter for only completed/held) ---
  const externalSalesFormatted: SaleRecordForRecentSales[] = (externalSalesData ?? [])
    .filter((sale: ExternalSaleRecordFromSupabase) => sale.status === "completed" || sale.status === "held")
    .map(
      (sale: ExternalSaleRecordFromSupabase): SaleRecordForRecentSales => ({
        ...sale,
        saleType: "External Sale",
        sale_items: sale.external_sale_items ?? [],
        users: Array.isArray(sale.users) ? sale.users[0] : sale.users,
        branches: Array.isArray(sale.branches) ? sale.branches[0] : sale.branches,
        transaction_reference: sale.transaction_reference,
        status: sale.status as "completed" | "held",
        created_at: sale.created_at ?? sale.sale_date ?? "",
        updated_at: sale.updated_at ?? sale.sale_date ?? "",
      })
    );

  const recentSalesFormatted: SaleRecordForRecentSales[] = (recentSalesData ?? [])
    .filter((sale) => sale.status === "completed" || sale.status === "held")
    .map(
      (sale): SaleRecordForRecentSales => ({
        ...sale,
        saleType: "Sale",
        sale_items: sale.sale_items ?? [],
        users: sale.users,
        branches: sale.branches,
        transaction_reference: sale.transaction_reference,
        status: sale.status,
        created_at: sale.created_at ?? sale.sale_date ?? "",
        updated_at: sale.updated_at ?? sale.sale_date ?? "",
      })
    );

  const mergedSales: SaleRecordForRecentSales[] = [...recentSalesFormatted, ...externalSalesFormatted].sort(
    (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
  );

  // --- Expense categories for filter dropdown in POS Expenses Review Modal ---
  const { data: expenseCategoriesForPos, error: expenseCategoriesError } = await supabase
    .from('expense_categories')
    .select('id, name, description')
    .order('name', { ascending: true })
    .returns<ExpenseCategoryForPos[]>();
  if (expenseCategoriesError) console.error("Error fetching expense categories for POS:", expenseCategoriesError.message);

  // --- Fetch expenses data for POS Expenses Review Modal (role-based filter) ---
  let expensesForPosQuery = supabase
    .from('expenses')
    .select(`
      id, date, amount, branch_id, expense_category_id, vendor_notes, description, recorded_by_user_id,
      branches(id, name),
      expense_categories(id, name),
      users(id, email)
    `)
    .order('date', { ascending: false });

  // --- Role-based filtering for expenses view ---
  if (profile.role === 'admin' || profile.role === 'general_manager') {
    // Admins/General Managers see all expenses
    // No additional filters needed here.
  } else if (profile.role === 'branch_manager' && profile.branch_id) {
    // Branch Managers see expenses for their branch
    expensesForPosQuery = expensesForPosQuery.eq('branch_id', profile.branch_id);
  } else if (profile.role === 'cashier') {
    // Cashiers only see expenses they recorded
    expensesForPosQuery = expensesForPosQuery.eq('recorded_by_user_id', currentUserId);
  }

  const { data: expensesForPos, error: expensesForPosError } = await expensesForPosQuery.returns<ExpenseRecordForPos[]>();
  if (expensesForPosError) {
    console.error("Error fetching expenses for POS review:", expensesForPosError.message);
  }

  // --- Render main POS interface ---
  return (
    <PosInterfaceClient
      initialProducts={products || []}
      initialCategories={categories || []}
      currentCashierId={currentUserId}
      currentUserRole={currentUserRole}
      currentUserBranchId={currentUserBranchId}
      branches={allBranches}
      initialDetailedStock={stockDetails || []}
      initialRecentSales={mergedSales}
      initialExpensesForReview={expensesForPos || []}
      initialExpenseCategoriesForReview={expenseCategoriesForPos || []}
    />
  );
}    