// src/app/receipt/external/[transaction_reference]/page.tsx
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ReceiptDisplayClient from '../../components/receipt-display-client';

// --- Type Definitions (aligned with pos/types.ts or local definitions) ---
type BusinessSettings = {
  id: string;
  business_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string | null;
  zip_postal_code: string | null;
  country: string;
  email: string | null;
  phone_number: string | null;
  tax_number: string | null;
  logo_url: string | null;
  receipt_prefix: string;
  date_format: string;
  currency_symbol: string;
  currency_position: 'prefix' | 'suffix';
  default_receipt_language: 'en' | 'fr';
};

type ExternalSaleItemForReceipt = {
  id: string;
  external_sale_id: string;
  product_name: string;
  product_category_name: string | null;
  product_unit_name: string | null;
  quantity: number;
  unit_sale_price: number;
  unit_purchase_price_negotiated: number;
  total_cost: number;
  total_price: number;
  note: string | null;
};

type ExternalSaleRecord = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'pending_approval' | 'cancelled';
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  authorized_by_user_id: string | null;
  authorization_code_hashed: string | null;
  users: { id: string; email: string; } | null; // Cashier
  branches: { id: string; name: string; location: string | null; } | null;
  authorized_by_user: { id: string; email: string; } | null; // Manager who authorized
  external_sale_items: ExternalSaleItemForReceipt[];
};

// Display types for ReceiptDisplayClient
type CommonSaleItemForDisplay = {
  id: string;
  quantity: number;
  unit_sale_price: number;
  total_price: number;
  note: string | null;
  product_name_display: string;
  product_unit_display: string;
  unit_purchase_price_negotiated?: number;
  total_cost?: number;
};

type CommonSaleRecordForDisplay = {
  id: string;
  sale_date: string;
  transaction_reference: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'held' | 'cancelled' | 'pending_approval';
  cashier_email: string;
  branch_name: string;
  authorized_by_email?: string;
  sale_type: 'Regular Sale' | 'External Sale';
  items: CommonSaleItemForDisplay[];
  total_cost?: number;
};

// The type of `params` is changed to `any` to resolve potential type conflicts
// with Next.js 15.x.x's internal type checking for PageProps.
export default async function ExternalReceiptPage({ params }: any) { // Changed from `ExternalReceiptPageProps` to `any`
  const { transaction_reference } = params;
  const supabase = await createServerSupabaseClient();

  // Fetch external sale record
  const { data: saleResult, error: saleError } = await supabase
    .from('external_sales')
    .select(`
      *,
      users!external_sales_cashier_id_fkey(id, email),
      branches(id, name, location),
      authorized_by_user:users!external_sales_authorized_by_user_id_fkey(id, email),
      external_sale_items(*)
    `)
    .eq('transaction_reference', transaction_reference)
    .single();

  if (saleError || !saleResult) {
    console.error("Error fetching external sale for receipt or sale not found:", saleError?.message || 'External Sale not found.');
    notFound();
  }
  const sale: ExternalSaleRecord = saleResult as ExternalSaleRecord;

  // Fetch business settings
  const { data: businessSettingsData, error: bsError } = await supabase
    .from('business_settings')
    .select('*')
    .single();

  if (bsError && bsError.code !== 'PGRST116') {
    console.error("Error fetching business settings for receipt:", bsError.message);
  }
  const businessSettings: BusinessSettings | null = (businessSettingsData as BusinessSettings) || null;

  // Transform ExternalSaleRecord to CommonSaleRecordForDisplay
  const totalCost = sale.external_sale_items.reduce((sum, item) => sum + item.total_cost, 0);

  const transformedSale: CommonSaleRecordForDisplay = {
    id: sale.id,
    sale_date: sale.sale_date,
    transaction_reference: sale.transaction_reference,
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    total_amount: sale.total_amount,
    payment_method: sale.payment_method,
    status: sale.status, // now includes 'pending_approval'
    cashier_email: sale.users?.email || 'N/A',
    branch_name: sale.branches?.name || 'N/A',
    authorized_by_email: sale.authorized_by_user?.email || 'N/A',
    sale_type: 'External Sale',
    total_cost: totalCost,
    items: sale.external_sale_items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      unit_sale_price: item.unit_sale_price,
      total_price: item.total_price,
      note: item.note,
      product_name_display: `${item.product_name} (${item.product_category_name || 'N/A'})`,
      product_unit_display: item.product_unit_name || 'N/A',
      unit_purchase_price_negotiated: item.unit_purchase_price_negotiated,
      total_cost: item.total_cost,
    })),
  };

  return (
    <ReceiptDisplayClient
      sale={transformedSale}
      businessSettings={businessSettings}
    />
  );
}
 