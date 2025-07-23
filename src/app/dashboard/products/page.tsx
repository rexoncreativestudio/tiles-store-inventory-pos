// src/app/dashboard/products/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import ProductManagementActions from './product-management-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductItem, CategoryForProductForm } from './types'; // Removed UnitForProductForm import



export default async function ProductManagementPage() {
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

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Product Management.");
    redirect('/dashboard/overview');
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, name, unique_reference, description, category_id, product_unit_abbreviation,
      purchase_price, sale_price, is_active, low_stock_threshold, image_url,
      categories(id, name, unit_abbreviation)
    `)
    .order('name', { ascending: true })
    .returns<ProductItem[]>();

  if (productsError) console.error("Error fetching products:", productsError.message);

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, unit_abbreviation')
    .returns<CategoryForProductForm[]>();

  if (categoriesError) console.error("Error fetching categories:", categoriesError.message);

  // REMOVED: Fetching units as the units table no longer exists.
  /*
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, abbreviation, name')
    .returns<UnitForProductForm[]>();

  if (unitsError) console.error("Error fetching units:", unitsError.message);
  */

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Product Management</h1>
        {/* REMOVED 'units' PROP: Only pass categories now */}
        <ProductManagementActions categories={categories || []} />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">SN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Sale Price</TableHead>
              <TableHead className="text-right">Stock Threshold</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products && products.length > 0 ? (
              products.map((product, idx) => (
                <TableRow key={product.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.unique_reference}</TableCell>
                  <TableCell>{product.categories?.name || 'N/A'}</TableCell>
                  <TableCell>{product.product_unit_abbreviation || 'N/A'}</TableCell>
                  <TableCell className="text-right">{product.sale_price}</TableCell>
                  <TableCell className="text-right">{product.low_stock_threshold}</TableCell>
                  <TableCell className="text-center">{product.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    {/* REMOVED 'units' PROP here too */}
                    <ProductManagementActions productToEdit={product} categories={categories || []} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}