// src/app/dashboard/stock/page.tsx
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
import StockAdjustmentActions from './stock-adjustment-actions';

// Define types for fetched data
type StockItem = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  last_updated_by_user_id: string | null;
  last_updated_at: string;
  products: {
    id: string;
    unique_reference: string;
    name: string;
    low_stock_threshold: number;
  } | null;
  warehouses: {
    id: string;
    name: string;
  } | null;
};

type ProductForSelect = {
  id: string;
  unique_reference: string;
  name: string;
};

type WarehouseForSelect = {
  id: string;
  name: string;
};


export default async function StockPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Enforce manager/admin access
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Stock Management.");
    redirect('/dashboard/overview');
  }

  // Fetch stock data with product and warehouse details
  const { data: stock, error: stockError } = await supabase
    .from('stock')
    .select(`
      id, product_id, warehouse_id, quantity, last_updated_by_user_id, last_updated_at,
      products(id, unique_reference, name, low_stock_threshold),
      warehouses(id, name)
    `)
    .returns<StockItem[]>();

  if (stockError) {
    console.error("Error fetching stock:", stockError.message);
    return <p className="text-red-500">Error loading stock data: {stockError.message}</p>;
  }

  // Fetch products and warehouses for the adjustment forms (select dropdowns)
  const { data: productsForSelect, error: productsForSelectError } = await supabase
    .from('products')
    .select('id, unique_reference, name')
    .returns<ProductForSelect[]>();

  if (productsForSelectError) console.error("Error fetching products for select:", productsForSelectError.message);


  const { data: warehousesForSelect, error: warehousesForSelectError } = await supabase
    .from('warehouses')
    .select('id, name')
    .returns<WarehouseForSelect[]>();

  if (warehousesForSelectError) console.error("Error fetching warehouses for select:", warehousesForSelectError.message);


  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        {/* Add Stock Adjustment button (for new adjustments) */}
        <StockAdjustmentActions
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
              <TableHead>Product Ref.</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock && stock.length > 0 ? (
              stock.map((item, idx) => (
                <TableRow key={item.id} className={item.quantity <= (item.products?.low_stock_threshold || 0) && item.quantity > 0 ? 'bg-yellow-50' : item.quantity === 0 ? 'bg-red-50' : ''}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">{item.products?.unique_reference || 'N/A'}</TableCell>
                  <TableCell>{item.products?.name || 'N/A'}</TableCell>
                  <TableCell>{item.warehouses?.name || 'N/A'}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{new Date(item.last_updated_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {item.quantity === 0 && <span className="text-red-600 font-semibold">Out of Stock</span>}
                    {item.quantity > 0 && item.quantity <= (item.products?.low_stock_threshold || 0) && <span className="text-yellow-600">Low Stock</span>}
                    {item.quantity > (item.products?.low_stock_threshold || 0) && <span className="text-green-600">In Stock</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Action button for each row to adjust existing stock */}
                    <StockAdjustmentActions
                      stockItemToAdjust={item}
                      products={productsForSelect || []}
                      warehouses={warehousesForSelect || []}
                      currentUserId={user.id}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No stock records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}