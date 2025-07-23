// src/app/dashboard/purchases/page.tsx
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
import { Button } from '@/components/ui/button'; // Ensure Button is imported
import RecordPurchaseActions from './record-purchase-actions'; // Client component for actions

// Define types for fetched data
type PurchaseItem = {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_purchase_price: number;
  total_cost: number;
  products: {
    id: string;
    name: string;
    unique_reference: string;
  } | null;
};

type PurchaseRecord = {
  id: string;
  purchase_date: string;
  warehouse_id: string;
  total_cost: number;
  registered_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  warehouses: {
    id: string;
    name: string;
  } | null;
  users: {
    id: string;
    email: string;
  } | null;
  purchase_items: PurchaseItem[]; // Joined purchase items
};

type ProductForSelect = {
  id: string;
  unique_reference: string;
  name: string;
  purchase_price: number; // To pre-fill purchase price
};

type WarehouseForSelect = {
  id: string;
  name: string;
};


export default async function PurchasesPage() {
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
    console.error("Access Denied: Unauthorized role trying to access Purchases.");
    redirect('/dashboard/overview');
  }

  // Fetch all purchases with related data
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select(`
      id, purchase_date, warehouse_id, total_cost, registered_by_user_id, created_at, updated_at,
      warehouses(id, name),
      users(id, email),
      purchase_items(id, product_id, quantity, unit_purchase_price, total_cost, products(id, name, unique_reference))
    `)
    .order('purchase_date', { ascending: false }) // Order by most recent purchase
    .returns<PurchaseRecord[]>();

  if (purchasesError) {
    console.error("Error fetching purchases:", purchasesError.message);
    return <p className="text-red-500">Error loading purchase records: {purchasesError.message}</p>;
  }

  // Fetch products and warehouses for the "Record New Purchase" form
  const { data: productsForSelect, error: productsForSelectError } = await supabase
    .from('products')
    .select('id, unique_reference, name, purchase_price')
    .returns<ProductForSelect[]>();

  if (productsForSelectError) console.error("Error fetching products for purchase form:", productsForSelectError.message);

  const { data: warehousesForSelect, error: warehousesForSelectError } = await supabase
    .from('warehouses')
    .select('id, name')
    .returns<WarehouseForSelect[]>();

  if (warehousesForSelectError) console.error("Error fetching warehouses for purchase form:", warehousesForSelectError.message);


  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchases</h1>
        <RecordPurchaseActions
          products={productsForSelect || []}
          warehouses={warehousesForSelect || []}
          currentUserId={user.id}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SN</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Registered By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases && purchases.length > 0 ? (
              purchases.map((purchase, idx) => (
                <TableRow key={purchase.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{new Date(purchase.purchase_date).toLocaleString()}</TableCell>
                  <TableCell>{purchase.warehouses?.name || 'N/A'}</TableCell>
                  <TableCell>{purchase.total_cost.toFixed(2)}</TableCell>
                  <TableCell>{purchase.users?.email || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" /* onClick={() => viewPurchaseDetails(purchase.id)} */>View Details</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No purchase records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}