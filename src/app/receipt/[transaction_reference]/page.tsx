// src/app/receipt/[transaction_reference]/page.tsx
// NO "use client" directive here. This is a Server Component.
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ReceiptDisplayClient from '../components/receipt-display-client'; // CORRECTED: Path to shared client component

// --- Type Definitions (from pos/types.ts or aligned with it) ---
type BusinessSettings = {
  id: string; business_name: string; address_line1: string; address_line2: string | null;
  city: string; state_province: string | null; zip_postal_code: string | null; country: string;
  email: string | null; phone_number: string | null; tax_number: string | null; logo_url: string | null;
  receipt_prefix: string; date_format: string; currency_symbol: string; currency_position: 'prefix' | 'suffix';
  default_receipt_language: 'en' | 'fr';
};

type ProductForSaleItem = {
    id: string;
    name: string;
    unique_reference: string;
    product_unit_abbreviation: string | null;
    purchase_price?: number; // Include purchase price for future profit calculations if needed
};

type SaleItemForReceipt = {
  id: string; sale_id: string; product_id: string; quantity: number; unit_sale_price: number;
  total_price: number; note: string | null;
  products: ProductForSaleItem | null;
};

type SaleRecord = { // Original detailed SaleRecord for fetching
  id: string; sale_date: string; cashier_id: string; branch_id: string;
  customer_name: string; customer_phone: string | null; total_amount: number;
  payment_method: string; status: 'completed' | 'held' | 'cancelled';
  transaction_reference: string; created_at: string; updated_at: string;
  users: { id: string; email: string; } | null;
  branches: { id: string; name: string; location: string | null; } | null;
  sale_items: SaleItemForReceipt[];
};

// NEW: CommonSaleItemForDisplay and CommonSaleRecordForDisplay for ReceiptDisplayClient
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
  status: 'completed' | 'held' | 'cancelled';
  cashier_email: string;
  branch_name: string;
  authorized_by_email?: string;
  sale_type: 'Regular Sale' | 'External Sale';
  items: CommonSaleItemForDisplay[];
};


interface RegularReceiptPageProps {
  params: {
    transaction_reference: string;
  };
}

export default async function RegularReceiptPage({ params }: RegularReceiptPageProps) {
  const { transaction_reference } = params;
  const supabase = await createServerSupabaseClient();

  const { data: saleResult, error: saleError } = await supabase
    .from('sales')
    .select(`
      *,
      users!sales_cashier_id_fkey(id, email),
      branches(id, name, location),
      sale_items(
        id, product_id, quantity, unit_sale_price, total_price, note,
        products(id, name, unique_reference, product_unit_abbreviation, purchase_price)
      )
    `)
    .eq('transaction_reference', transaction_reference)
    .single();

  if (saleError || !saleResult) {
    console.error("Error fetching regular sale for receipt or sale not found:", saleError?.message || 'Regular Sale not found.');
    notFound();
  }
  const sale: SaleRecord = saleResult as SaleRecord;


  const { data: businessSettingsData, error: bsError } = await supabase
    .from('business_settings')
    .select('*')
    .single();

  if (bsError && bsError.code !== 'PGRST116') {
    console.error("Error fetching business settings for receipt:", bsError.message);
  }
  const businessSettings: BusinessSettings | null = (businessSettingsData as BusinessSettings) || null;

  // Transform SaleRecord to CommonSaleRecordForDisplay
  const transformedSale: CommonSaleRecordForDisplay = {
    id: sale.id,
    sale_date: sale.sale_date,
    transaction_reference: sale.transaction_reference,
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    total_amount: sale.total_amount,
    payment_method: sale.payment_method,
    status: sale.status,
    cashier_email: sale.users?.email || 'N/A',
    branch_name: sale.branches?.name || 'N/A',
    sale_type: 'Regular Sale',
    items: sale.sale_items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      unit_sale_price: item.unit_sale_price,
      total_price: item.total_price,
      note: item.note,
      product_name_display: `${item.products?.name || 'N/A'} (${item.products?.unique_reference || 'N/A'})`,
      product_unit_display: item.products?.product_unit_abbreviation || 'N/A',
      // No unit_purchase_price_negotiated or total_cost for regular sales
    })),
  };

  return (
    <ReceiptDisplayClient
      sale={transformedSale}
      businessSettings={businessSettings}
    />
  );
}