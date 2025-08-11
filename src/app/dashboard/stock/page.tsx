import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import StockManagementClient from './components/stock-management-client';
import StockAdjustmentButton from './components/stock-adjustment-button';
import type {
  ProductForStock,
  ProductStockDetail,
  WarehouseForFilter,
} from './types';

export default async function StockManagementPage({ searchParams }: any) {
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
    console.error("Access Denied: Unauthorized role trying to access Stock Management.");
    redirect('/dashboard/overview');
  }

  const currentUserId = currentUserProfile.id;

  // --- Pagination ---
  const urlParams = new URLSearchParams(
    Object.entries(searchParams ?? {}).map(([key, value]) => [key, String(value)])
  );
  const page = parseInt(urlParams.get('page') || "1", 10);
  const itemsPerPage = parseInt(urlParams.get('itemsPerPage') || "10", 10);

  // --- Fetch all products for filtering/search ---
  const { data: allProducts, error: allProductsError } = await supabase
    .from('products')
    .select(`
      id, name, unique_reference, low_stock_threshold, product_unit_abbreviation,
      categories(id, name)
    `)
    .order('name', { ascending: true })
    .returns<ProductForStock[]>();
  if (allProductsError) console.error("Error fetching all products for stock:", allProductsError.message);

  // --- Fetch paginated products ---
  const fromIdx = (page - 1) * itemsPerPage;
  const toIdx = fromIdx + itemsPerPage - 1;
  const { data: paginatedProducts, error: paginatedProductsError } = await supabase
    .from('products')
    .select(`
      id, name, unique_reference, low_stock_threshold, product_unit_abbreviation,
      categories(id, name)
    `)
    .order('name', { ascending: true })
    .range(fromIdx, toIdx)
    .returns<ProductForStock[]>();
  if (paginatedProductsError) console.error("Error fetching paginated products for stock:", paginatedProductsError.message);

  // --- Fetch total products count for pagination ---
  const { count: totalProductsCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  // --- Fetch all stock details ---
  const { data: stockDetails, error: stockError } = await supabase
    .from('stock')
    .select(`
      product_id, quantity, warehouse_id,
      warehouses(id, name)
    `)
    .returns<ProductStockDetail[]>();
  if (stockError) console.error("Error fetching stock details:", stockError.message);

  // --- Fetch warehouses for filter dropdown ---
  const { data: warehouses, error: warehousesError } = await supabase
    .from('warehouses')
    .select('id, name')
    .returns<WarehouseForFilter[]>();
  if (warehousesError) console.error("Error fetching warehouses for filter:", warehousesError.message);

  return (
    <div className="p-8">
      {/* --- Title Section --- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stock Management</h1>
        <StockAdjustmentButton
          products={allProducts || []}
          warehouses={warehouses || []}
          currentUserId={currentUserId}
        />
      </div>
      {/* --- Main Container --- */}
      <div className="bg-white rounded-lg shadow-md px-8 py-8">
        <StockManagementClient
          products={paginatedProducts || []}
          allProducts={allProducts || []}
          stockDetails={stockDetails || []}
          warehouses={warehouses || []}
          totalProductsCount={totalProductsCount ?? 0}
          initialPage={page}
          initialItemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  );
} 