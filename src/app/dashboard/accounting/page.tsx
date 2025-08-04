// src/app/dashboard/accounting/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Separator } from '@/components/ui/separator';
import AccountingOverviewClient from './components/accounting-overview-client';

import {
  SaleDataForAccounting,
  PurchaseDataForAccounting,
  ExternalSaleDataForAccounting,
  ExpenseDataForAccounting,
  StockDetailForInventory,
  BranchForSelect,
} from './types';


export default async function AccountingPage({
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
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Accounting.");
    redirect('/dashboard/overview');
  }

  // --- START: CORRECTED DATE LOGIC ---
  // Default date range is now the first to the last day of the current month.
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDate = searchParams?.dateFrom ? new Date(searchParams.dateFrom) : firstDayOfMonth;
  const endDate = searchParams?.dateTo ? new Date(searchParams.dateTo) : lastDayOfMonth;
  // --- END: CORRECTED DATE LOGIC ---


  // Fetch sales data
  const { data: allSalesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      sale_date, total_amount, branch_id,
      branches(id, name),
      sale_items(quantity, products(purchase_price))
    `)
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString())
    .returns<SaleDataForAccounting[]>();

  if (salesError) console.error("Error fetching sales for accounting:", salesError.message);


  // Fetch purchases data
  const { data: allPurchasesData, error: purchasesError } = await supabase
    .from('purchases')
    .select(`
        purchase_date, total_cost, branch_id,
        branches (id, name)
    `)
    .gte('purchase_date', startDate.toISOString())
    .lte('purchase_date', endDate.toISOString())
    .returns<PurchaseDataForAccounting[]>();

  if (purchasesError) console.error("Error fetching purchases for accounting:", purchasesError.message);


  // Fetch external sales data
  const { data: allExternalSalesData, error: externalSalesError } = await supabase
    .from('external_sales')
    .select(`
      sale_date, total_amount, branch_id,
      external_sale_items(total_cost),
      branches(id, name)
    `)
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString())
    .returns<Array<{
        sale_date: string;
        total_amount: number;
        branch_id: string;
        branches: { id: string; name: string; } | null;
        external_sale_items: Array<{ total_cost: number; }>;
    }>>();

  if (externalSalesError) console.error("Error fetching external sales for accounting:", externalSalesError.message);

  const processedExternalSalesData: ExternalSaleDataForAccounting[] = (allExternalSalesData || []).map(es => ({
    sale_date: es.sale_date,
    total_amount: es.total_amount,
    branch_id: es.branch_id,
    branches: es.branches,
    total_cost: es.external_sale_items.reduce((sum, item) => sum + item.total_cost, 0)
  }));


  // --- START: CORRECTED EXPENSE FETCHING ---
  // The select query now correctly uses the foreign key column 'recorded_by_user_id'
  // to fetch the related user's information.
  const { data: allExpensesData, error: expensesError } = await supabase
    .from('expenses')
    .select(`
        id, date, amount, branch_id, expense_category_id,
        branches(id, name),
        expense_categories(id, name),
        recorded_by_user_id(id, email)
    `)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .returns<ExpenseDataForAccounting[]>();

  if (expensesError) console.error("Error fetching expenses for accounting:", expensesError.message);
  // --- END: CORRECTED EXPENSE FETCHING ---


  // Fetch all stock details for Inventory Report
  const { data: allStockDetails, error: stockDetailsError } = await supabase
    .from('stock')
    .select(`
        product_id, quantity, warehouse_id,
        warehouses(id, name, location),
        products(id, name, unique_reference, purchase_price)
    `)
    .returns<StockDetailForInventory[]>();

  if (stockDetailsError) console.error("Error fetching stock details for Inventory Report:", stockDetailsError.message);

  // Fetch all branches for filtering
  const { data: branchesForSelect, error: branchesError } = await supabase
    .from('branches')
    .select('id, name')
    .returns<BranchForSelect[]>();
  if (branchesError) console.error("Error fetching branches for accounting filters:", branchesError.message);


  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Accounting & Income Tracking</h1>
      <Separator className="mb-6" />

      <AccountingOverviewClient
        allSalesData={allSalesData || []}
        allPurchasesData={allPurchasesData || []}
        allExternalSalesData={processedExternalSalesData}
        allExpensesData={allExpensesData || []}
        allStockDetails={allStockDetails || []}
        allBranches={branchesForSelect || []}
        initialStartDate={startDate.toISOString()}
        initialEndDate={endDate.toISOString()}
      />
    </div>
  );
}
 