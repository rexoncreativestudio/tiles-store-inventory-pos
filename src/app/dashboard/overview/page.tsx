// src/app/(dashboard)/dashboard/overview/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Separator } from '@/components/ui/separator';
import DashboardOverviewClient from './components/dashboard-overview-client';

import {
  SaleData,
  ExternalSaleData,
  ExpenseData,
  StockData,
} from './types';

export default async function DashboardOverviewPage({
  searchParams,
}: any) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // ... (data fetching logic remains the same) ...

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, branch_id')
    .eq('id', user.id)
    .single();

  const allowedRoles = [
    'admin',
    'general_manager',
    'branch_manager',
    'cashier',
  ];

  if (profileError || !currentUserProfile || !allowedRoles.includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Dashboard Overview.");
    redirect('/');
  }

  const endDate = searchParams?.dateTo ? new Date(searchParams.dateTo) : new Date();
  const startDate = searchParams?.dateFrom ? new Date(searchParams.dateFrom) : new Date(new Date().setDate(endDate.getDate() - 30));


  const { data: allSalesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      sale_date, total_amount, branch_id,
      branches(id, name),
      sale_items(quantity, products(purchase_price))
    `)
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString())
    .returns<SaleData[]>();

  if (salesError) console.error("Error fetching sales for dashboard:", salesError.message);

  const { data: allExternalSalesData, error: externalSalesError } = await supabase
    .from('external_sales')
    .select(`
      sale_date, total_amount, branch_id,
      external_sale_items(total_cost),
      branches(id, name)
    `)
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString())
    .returns<ExternalSaleData[]>();

  if (externalSalesError) console.error("Error fetching external sales for dashboard:", externalSalesError.message);

  const { data: allExpensesData, error: expensesError } = await supabase
    .from('expenses')
    .select(`
        date, amount, branch_id,
        branches(id, name),
        users(id, email)
    `)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .returns<ExpenseData[]>();

  if (expensesError) console.error("Error fetching expenses for dashboard:", expensesError.message);

  const { data: allStockData, error: stockError } = await supabase
    .from('stock')
    .select(`
        product_id, quantity, warehouse_id,
        products(id, purchase_price),
        warehouses(id, name)
    `)
    .returns<StockData[]>();

  if (stockError) console.error("Error fetching stock data for dashboard inventory:", stockError.message);

  return (
    // The main container is simplified. Spacing is handled by the client component.
    <div className="flex-1 w-full">
      <div className="flex items-center justify-between space-y-2 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
      </div>
      <Separator className="mb-6" />

      <DashboardOverviewClient
        allSalesData={allSalesData || []}
        allExternalSalesData={allExternalSalesData || []} 
        allExpensesData={allExpensesData || []} 
        allStockData={allStockData || []}
        initialStartDate={startDate.toISOString()}
        initialEndDate={endDate.toISOString()}
      />   
    </div>
  );  
}