import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import PurchaseOverviewClient from './components/purchase-overview-client';
import PurchaseActionsClient from './components/purchase-actions-client';
import { Card, CardContent } from '@/components/ui/card';

type ProductForPurchaseItem = {
  id: string;
  name: string;
  unique_reference: string;
  product_unit_abbreviation: string | null;
  purchase_price?: number;
};

type PurchaseItemForDisplay = {
  id: string;
  product_id: string;
  quantity: number;
  unit_purchase_price: number;
  total_cost: number;
  note: string | null;
  products: ProductForPurchaseItem | null;
};

type PurchaseRecordForDisplay = {
  id: string;
  purchase_date: string;
  warehouse_id: string | null;
  total_cost: number;
  status: string;
  warehouses: { id: string; name: string; } | null;
  purchase_items: PurchaseItemForDisplay[];
};

type WarehouseForFilter = {
  id: string;
  name: string;
};

type PurchaseRecordForEdit = {
  id: string;
  purchase_date: string;
  warehouse_id: string | null;
  total_cost: number;
  status: string;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_purchase_price: number;
    note: string | null;
  }[];
};

function mapToEditRecord(purchase?: PurchaseRecordForDisplay): PurchaseRecordForEdit | undefined {
  if (!purchase) return undefined;
  return {
    id: purchase.id,
    purchase_date: purchase.purchase_date,
    warehouse_id: purchase.warehouse_id,
    total_cost: purchase.total_cost,
    status: purchase.status,
    items: (purchase.purchase_items ?? []).map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      product_id: item.product_id,
      quantity: item.quantity,
      unit_purchase_price: item.unit_purchase_price,
      note: item.note,
    })),
  };
}

export default async function PurchaseManagementPage({
  searchParams,
}: any) {
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

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    redirect('/dashboard/overview');
  }

  const currentUserId = currentUserProfile.id;

  // REMOVE pagination logic
  // const page = parseInt(searchParams?.page || "1", 10);
  // const itemsPerPage = parseInt(searchParams?.itemsPerPage || "10", 10);
  // const fromIdx = (page - 1) * itemsPerPage;
  // const toIdx = fromIdx + itemsPerPage - 1;

  // Fetch all purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select(`
      id, purchase_date, warehouse_id, total_cost, status,
      warehouses(id, name),
      purchase_items(
        id, product_id, quantity, unit_purchase_price, total_cost, note,
        products(id, name, unique_reference, product_unit_abbreviation, purchase_price)
      )
    `)
    .order('purchase_date', { ascending: false })
    .returns<PurchaseRecordForDisplay[]>();

  if (purchasesError) console.error("Error fetching purchases:", purchasesError.message);

  const { data: productsForSelection } = await supabase
    .from('products')
    .select('id, name, unique_reference, product_unit_abbreviation, purchase_price')
    .order('name', { ascending: true })
    .returns<ProductForPurchaseItem[]>();

  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, name')
    .order('name', { ascending: true })
    .returns<WarehouseForFilter[]>();

  const editId = searchParams?.edit ?? null;
  const purchaseToEdit = mapToEditRecord(purchases?.find(p => p.id === editId));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Management</h1>
        <PurchaseActionsClient
          purchaseToEdit={purchaseToEdit}
          editId={editId}
          products={productsForSelection ?? []}
          warehouses={warehouses ?? []}
          currentUserId={currentUserId}
          onPurchaseSubmitted={async () => { 'use server'; }}
        />
      </div>
      <Card>
        <CardContent className="pt-6">
          <PurchaseOverviewClient
            initialPurchases={purchases ?? []}
            initialWarehouses={warehouses ?? []}
          />
        </CardContent>  
      </Card>
    </div>
  );
}