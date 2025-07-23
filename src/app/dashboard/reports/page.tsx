// src/app/dashboard/reports/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import SalesReportTable from './sales-report-table';
import StockPurchaseReportTable from './stock-purchase-report-table';

// Define types for data that reports might need (consistent with client components)
type PurchaseDataForReport = {
    id: string;
    purchase_date: string;
    warehouse_id: string;
    total_cost: number;
    registered_by_user_id: string | null;
    created_at: string;
    updated_at: string;
    warehouses: { id: string; name: string; } | null;
    users: { id: string; email: string; } | null;
    purchase_items: Array<{
      id: string; product_id: string; quantity: number; unit_purchase_price: number;
      total_cost: number;
      products: { id: string; name: string; unique_reference: string; units: { abbreviation: string } | null; } | null;
    }>;
};

type SaleDataForReport = {
    id: string;
    sale_date: string;
    total_amount: number;
    branch_id: string;
    cashier_id: string;
    status: 'completed' | 'held' | 'cancelled';
    transaction_reference: string;
    customer_name: string | null;
    customer_phone: string | null;
    payment_method: string;
    users: { id: string; email: string; } | null;
    branches: { id: string; name: string; } | null;
    sale_items: Array<{
      id: string; product_id: string; quantity: number; unit_sale_price: number;
      total_price: number; note: string | null;
      products: { id: string; name: string; unique_reference: string; units: { abbreviation: string } | null; } | null;
    }>;
};

type BranchForSelect = {
  id: string;
  name: string;
};

type CategoryForSelect = {
  id: string;
  name: string;
};

type ProductForSelect = {
  id: string;
  name: string;
  unique_reference: string;
};

type UserForSelect = {
  id: string;
  email: string;
};

type WarehouseForSelect = {
  id: string;
  name: string;
};


export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Enforce admin/manager access
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Reports.");
    redirect('/dashboard/overview');
  }

  // Fetch all data necessary for filters and initial reports (server-side)
  const { data: allSalesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      id, sale_date, total_amount, branch_id, cashier_id, status, transaction_reference, customer_name, customer_phone, payment_method,
      users(id, email),
      branches(id, name),
      sale_items(id, product_id, quantity, unit_sale_price, total_price, note, products(id, name, unique_reference, units(abbreviation)))
    `)
    .order('sale_date', { ascending: false })
    .returns<SaleDataForReport[]>();

  if (salesError) console.error("Error fetching sales data for reports:", salesError.message);

  const { data: allPurchasesData, error: purchasesError } = await supabase
    .from('purchases')
    .select(`
      id, purchase_date, warehouse_id, total_cost, registered_by_user_id, created_at, updated_at,
      warehouses(id, name),
      users(id, email),
      purchase_items(id, product_id, quantity, unit_purchase_price, total_cost, products(id, name, unique_reference, units(abbreviation)))
    `)
    .order('purchase_date', { ascending: false })
    .returns<PurchaseDataForReport[]>();

  if (purchasesError) console.error("Error fetching purchases data for reports:", purchasesError.message);


  // Fetch filter options
  const { data: branches, error: branchesError } = await supabase.from('branches').select('id, name').returns<BranchForSelect[]>();
  if (branchesError) console.error("Error fetching branches for filters:", branchesError.message);

  const { data: categories, error: categoriesError } = await supabase.from('categories').select('id, name').returns<CategoryForSelect[]>();
  if (categoriesError) console.error("Error fetching categories for filters:", categoriesError.message);

  const { data: products, error: productsError } = await supabase.from('products').select('id, name, unique_reference').returns<ProductForSelect[]>();
  if (productsError) console.error("Error fetching products for filters:", productsError.message);

  const { data: usersForFilter, error: usersForFilterError } = await supabase.from('users').select('id, email').returns<UserForSelect[]>();
  if (usersForFilterError) console.error("Error fetching users for filters:", usersForFilterError.message);

  const { data: warehouses, error: warehousesError } = await supabase.from('warehouses').select('id, name').returns<WarehouseForSelect[]>();
  if (warehousesError) console.error("Error fetching warehouses for filters:", warehousesError.message);


  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
      <Separator className="mb-6" />

      {/* CORRECTED: Use a grid layout for the cards themselves */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6"> {/* Changed to 1 column on medium screens, full width */}
        {/* Sales Report Table */}
        <Card className="mb-6"> {/* Removed mb-6 here as it's handled by grid gap */}
          <CardHeader>
            <CardTitle>Sales Report</CardTitle>
            <CardDescription>Detailed sales transactions with filters.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesReportTable
              allSalesData={allSalesData || []}
              allBranches={branches || []}
              allCashiers={usersForFilter || []}
            />
          </CardContent>
        </Card>

        {/* Stock Purchase Report Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Purchase Report</CardTitle>
            <CardDescription>Detailed purchase records with filters.</CardDescription>
          </CardHeader>
          <CardContent>
            <StockPurchaseReportTable
              allPurchasesData={allPurchasesData || []}
              allBranches={branches || []}
              allUsers={usersForFilter || []}
              allProducts={products || []}
              allWarehouses={warehouses || []}
              allCategories={categories || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}