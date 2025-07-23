// src/app/dashboard/sales/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Removed unused: Button, useCurrencyFormatter
import SalesFilterActions from './sales-filter-actions'; // CORRECTED: Relative import path
import SaleTableRowClient from './sale-table-row-client'; // CORRECTED: Import the component


// Define types for fetched data
type SaleItemDetails = {
  id: string;
  product_id: string;
  quantity: number;
  unit_sale_price: number;
  total_price: number;
  note: string | null;
  products: {
    id: string;
    name: string;
    unique_reference: string;
  } | null;
};

type SaleRecord = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'held' | 'cancelled';
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    email: string;
  } | null; // Cashier who made the sale
  branches: {
    id: string;
    name: string;
  } | null; // Branch where sale occurred
  sale_items: SaleItemDetails[]; // Details of items sold
};

type UserForSelect = {
  id: string;
  email: string;
};

type BranchForSelect = {
  id: string;
  name: string;
};


export default async function SalesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Enforce access: Admin/General Manager can see all; Branch Manager sees their branch; Cashiers see their own.
  // For this page, Admin/General Manager/Branch Manager should see the list.
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role, branch_id')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Sales Review.");
    redirect('/dashboard/overview');
  }

  // Base query for sales
  let salesQuery = supabase
    .from('sales')
    .select(`
      id, sale_date, cashier_id, branch_id, customer_name, customer_phone,
      total_amount, payment_method, status, transaction_reference, created_at, updated_at,
      users(id, email),
      branches(id, name),
      sale_items(id, product_id, quantity, unit_sale_price, total_price, note, products(id, name, unique_reference))
    `);

  // Apply RLS-like filtering for Branch Managers on the server-side
  if (currentUserProfile?.role === 'branch_manager' && currentUserProfile.branch_id) {
    salesQuery = salesQuery.eq('branch_id', currentUserProfile.branch_id);
  }

  // Fetch sales data
  const { data: sales, error: salesError } = await salesQuery
    .order('sale_date', { ascending: false })
    .returns<SaleRecord[]>();

  if (salesError) {
    console.error("Error fetching sales:", salesError.message);
    return <p className="text-red-500">Error loading sales data: {salesError.message}</p>;
  }

  // Fetch users (cashiers) and branches for filter options
  const { data: cashiersForSelect, error: cashiersError } = await supabase
    .from('users')
    .select('id, email')
    .in('role', ['admin', 'general_manager', 'branch_manager', 'cashier'])
    .returns<UserForSelect[]>();
  if (cashiersError) console.error("Error fetching cashiers for select:", cashiersError.message);

  const { data: branchesForSelect, error: branchesForSelectError } = await supabase
    .from('branches')
    .select('id, name')
    .returns<BranchForSelect[]>();
  if (branchesForSelectError) console.error("Error fetching branches for select:", branchesForSelectError.message);


  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Review</h1>
        <SalesFilterActions
          cashiers={cashiersForSelect || []}
          branches={branchesForSelect || []}
          initialSales={sales || []}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SN</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Ref.</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales && sales.length > 0 ? (
              sales.map((sale, idx) => (
                <SaleTableRowClient
                  key={sale.id}
                  sale={sale}
                  idx={idx}
                  allCashiers={cashiersForSelect || []}
                  allBranches={branchesForSelect || []}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No sales records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}