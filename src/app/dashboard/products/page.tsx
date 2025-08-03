import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import ProductManagementHeader from './components/product-management-header';
import { ProductItem, CategoryForProductForm } from './types';
import ProductOverviewClient from './components/product-overview-client';

export default async function ProductManagementPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    category?: string;
    active?: string;
    page?: string;
    limit?: string;
  };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } = {} } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Product Management.");
    redirect('/dashboard/overview');
  }

  // Pagination params
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let productsQuery = supabase
    .from('products')
    .select(`
      id, name, unique_reference, description, category_id, product_unit_abbreviation,
      purchase_price, sale_price, is_active, low_stock_threshold, image_url,
      categories(id, name, unit_abbreviation)
    `, { count: 'exact' })
    .order('name', { ascending: true });

  if (searchParams?.query) {
    const searchTerm = `%${searchParams.query.toLowerCase()}%`;
    productsQuery = productsQuery.or(
      `name.ilike.${searchTerm},unique_reference.ilike.${searchTerm},description.ilike.${searchTerm}`
    );
  }
  if (searchParams?.category && searchParams.category !== 'all') {
    productsQuery = productsQuery.eq('category_id', searchParams.category);
  }
  if (searchParams?.active && searchParams.active !== 'all') {
    productsQuery = productsQuery.eq('is_active', searchParams.active === 'true');
  }

  productsQuery = productsQuery.range(from, to);

  const { data: products, error: productsError, count: totalItems } = await productsQuery.returns<ProductItem[]>();
  if (productsError) console.error("Error fetching products:", productsError.message);

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, unit_abbreviation')
    .returns<CategoryForProductForm[]>();

  if (categoriesError) console.error("Error fetching categories:", categoriesError.message);

  return (
    <div className="p-8">
      {/* --- Title/Filter Section --- */}
      <div className="rounded-lg px-8 py-8 mb-8">
        <ProductManagementHeader categories={categories || []} />
      </div>
      {/* --- Product Table/Overview Section --- */}
      <div className="bg-white rounded-lg shadow-md px-8 py-8">
        <ProductOverviewClient
          initialProducts={products || []}
          initialCategories={categories || []}
          currentPage={page}
          itemsPerPage={limit}
          totalItems={totalItems || 0}
        />
      </div>
    </div>
  );
}