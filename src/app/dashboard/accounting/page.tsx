// src/app/dashboard/accounting/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Separator } from '@/components/ui/separator';
import AccountingOverviewClient from './accounting-overview-client';

type SaleDataForAccounting = {
    sale_date: string;
    total_amount: number;
    branch_id: string;
    branches: { id: string; name: string; } | null;
};

type PurchaseDataForAccounting = {
    purchase_date: string;
    total_cost: number;
};

type ExternalSaleDataForAccounting = {
    sale_date: string;
    total_amount: number;
    total_cost: number;
    branch_id: string;
    branches: { id: string; name: string; } | null;
};

type BranchForSelect = {
  id: string;
  name: string;
};

export default async function AccountingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Accounting.");
    redirect('/dashboard/overview');
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const { data: allSalesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      sale_date, total_amount, branch_id,
      branches(id, name)
    `)
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString())
    .returns<SaleDataForAccounting[]>();

  if (salesError) console.error("Error fetching sales for accounting:", salesError.message);

  const { data: allPurchasesData, error: purchasesError } = await supabase
    .from('purchases')
    .select('purchase_date, total_cost')
    .gte('purchase_date', startDate.toISOString())
    .lte('purchase_date', endDate.toISOString())
    .returns<PurchaseDataForAccounting[]>();

  if (purchasesError) console.error("Error fetching purchases for accounting:", purchasesError.message);

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
        allBranches={branchesForSelect || []}
        initialStartDate={startDate.toISOString()}
        initialEndDate={endDate.toISOString()}
      />
    </div>
  );
}