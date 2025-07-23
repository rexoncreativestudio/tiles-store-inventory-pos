import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PosInterfaceClient from './pos-interface-client';
import { CategoryForPos, ProductForPos, ProductStockDetail } from './types';

export default async function PosPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: cashierProfile, error: cashierProfileError } = await supabase
    .from('users')
    .select('id, email, branch_id')
    .eq('id', user.id)
    .single();

  if (cashierProfileError || !cashierProfile?.branch_id) {
    console.error("Cashier profile or branch_id not found:", cashierProfileError?.message);
    redirect('/login');
  }

  const currentCashierId = cashierProfile.id;

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, unique_reference, name, image_url, sale_price, low_stock_threshold, category_id
    `)
    .order('name', { ascending: true })
    .returns<ProductForPos[]>();

  if (productsError) {
    console.error("Error fetching products for POS:", productsError.message);
  }

  const { data: stockDetails, error: stockError } = await supabase
    .from('stock')
    .select(`
      product_id, quantity, warehouse_id,
      warehouses(id, name)
    `)
    .returns<ProductStockDetail[]>();

  if (stockError) {
    console.error("Error fetching stock details for POS:", stockError.message);
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, unit_abbreviation')
    .returns<CategoryForPos[]>();

  if (categoriesError) {
    console.error("Error fetching categories for POS:", categoriesError.message);
  }

  return (
    <PosInterfaceClient
      initialProducts={products || []}
      initialCategories={categories || []}
      currentCashierId={currentCashierId}
      initialDetailedStock={stockDetails || []}
    />
  );
}