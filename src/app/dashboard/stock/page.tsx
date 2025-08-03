// src/app/dashboard/stock/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import StockOverviewClient from './components/stock-overview-client';
import StockAdjustmentButton from './components/stock-adjustment-button';

// ADD THIS IMPORT
import StockPaginationClient from './components/stock-pagination-client';

// --- Type Definitions (aligned with client component and database schema) ---
type ProductForStock = {
  id: string;
  name: string;
  unique_reference: string;
  low_stock_threshold: number;
  product_unit_abbreviation: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
};

type ProductStockDetail = {
  product_id: string;
  quantity: number;
  warehouse_id: string;
  warehouses: {
    id: string;
    name: string;
  } | null;
};

type CategoryForFilter = {
  id: string;
  name: string;
};

type WarehouseForFilter = {
  id: string;
  name: string;
};

export default async function StockManagementPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('id, role') // Fetch user ID too
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Stock Management.");
    redirect('/dashboard/overview');
  }

  const currentUserId = currentUserProfile.id; // Get the user ID here

  // --- Pagination ---
  const urlParams = new URLSearchParams(Object.entries(searchParams ?? {}).map(([key, value]) => [key, value]));
  const page = parseInt(urlParams.get('page') || "1", 10);
  const itemsPerPage = parseInt(urlParams.get('itemsPerPage') || "10", 10);
  const fromIdx = (page - 1) * itemsPerPage;
  const toIdx = fromIdx + itemsPerPage - 1;

  // Fetch total products count for pagination
  const { count: totalProductsCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  // Fetch products with category and unit abbreviation (paginated)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, name, unique_reference, low_stock_threshold, product_unit_abbreviation,
      categories(id, name)
    `)
    .order('name', { ascending: true })
    .range(fromIdx, toIdx)
    .returns<ProductForStock[]>();

  if (productsError) console.error("Error fetching products for stock:", productsError.message);

  // Fetch all stock details
  const { data: stockDetails, error: stockError } = await supabase
    .from('stock')
    .select(`
      product_id, quantity, warehouse_id,
      warehouses(id, name)
    `)
    .returns<ProductStockDetail[]>();

  if (stockError) console.error("Error fetching stock details:", stockError.message);

  // Fetch categories for filter dropdown
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name')
    .returns<CategoryForFilter[]>();

  if (categoriesError) console.error("Error fetching categories for filter:", categoriesError.message);

  // Fetch warehouses for filter dropdown
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
        {/* Pass currentUserId to the StockAdjustmentButton */}
        <StockAdjustmentButton
          products={products || []}
          warehouses={warehouses || []}
          currentUserId={currentUserId}
        />
      </div>
      {/* --- Main Container --- */}
      <div className="bg-white rounded-lg shadow-md px-8 py-8">
        {/* --- Section: Stock Overview --- */}
        <div className="mb-8">
          <StockOverviewClient
            initialProducts={products || []}
            initialStockDetails={stockDetails || []}
            initialCategories={categories || []}
            initialWarehouses={warehouses || []}
          />
        </div>

        {/* --- Pagination controls only at the bottom --- */}
        <div className="flex justify-center">
          <StockPaginationClient
            totalItems={totalProductsCount ?? 0}
            itemsPerPage={itemsPerPage}
            currentPage={page}
          />
        </div>
      </div>
    </div>
  );
} 