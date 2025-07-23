// src/app/receipt/[transaction_reference]/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import React from 'react';

import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PrintButtonClient from '../print-button-client';


// Define types for fetched data
type BusinessSettings = {
  id: string; business_name: string; address_line1: string; address_line2: string | null;
  city: string; state_province: string | null; zip_postal_code: string | null; country: string;
  email: string | null; phone_number: string | null; tax_number: string | null; logo_url: string | null;
  receipt_prefix: string; date_format: string; currency_symbol: string; currency_position: 'prefix' | 'suffix';
  default_receipt_language: 'en' | 'fr';
};

type ReceiptPhrase = {
  id: string; phrase_key: string; language: 'en' | 'fr'; text: string;
};

type SaleItemForReceipt = {
  id: string; product_id: string; quantity: number; unit_sale_price: number;
  total_price: number; note: string | null;
  products: { id: string; name: string; unique_reference: string; units: { abbreviation: string } | null; } | null;
};

type SaleRecordForReceipt = {
  id: string; sale_date: string; cashier_id: string; branch_id: string;
  customer_name: string; customer_phone: string | null; total_amount: number;
  payment_method: string; status: 'completed' | 'held' | 'cancelled';
  transaction_reference: string; created_at: string; updated_at: string;
  users: { id: string; email: string; } | null;
  branches: { id: string; name: string; location: string | null; } | null;
  sale_items: SaleItemForReceipt[];
};


interface ReceiptPageProps {
  params: {
    transaction_reference: string;
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { transaction_reference } = params;
  const supabase = await createServerSupabaseClient();

  // Fetch sale details
  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .select(`
      *,
      users(id, email),
      branches(id, name, location),
      sale_items(id, product_id, quantity, unit_sale_price, total_price, note, products(id, name, unique_reference, units(abbreviation)))
    `)
    .eq('transaction_reference', transaction_reference)
    .single();

  if (saleError || !saleData) {
    console.error("Error fetching sale for receipt or sale not found:", saleError?.message || 'Sale not found.');
    notFound();
  }
  const sale: SaleRecordForReceipt = saleData as unknown as SaleRecordForReceipt;


  // Fetch business settings
  const { data: businessSettingsData, error: bsError } = await supabase
    .from('business_settings')
    .select('*')
    .single();

  if (bsError && bsError.code !== 'PGRST116') {
    console.error("Error fetching business settings for receipt:", bsError.message);
  }
  const businessSettings: BusinessSettings | null = (businessSettingsData as unknown as BusinessSettings) || null;


  // Fetch receipt phrases for default language
  const { data: receiptPhrasesData, error: rpError } = await supabase
    .from('receipt_phrases')
    .select('phrase_key, text')
    .eq('language', businessSettings?.default_receipt_language || 'en');

  if (rpError) {
    console.error("Error fetching receipt phrases:", rpError.message);
  }
  const receiptPhrases: ReceiptPhrase[] = (receiptPhrasesData as ReceiptPhrase[]) || [];


  // Map phrases to an object for easy access
  const phrasesMap = new Map(receiptPhrases.map(p => [p.phrase_key, p.text]) || []);

  const getPhrase = (key: string, defaultValue: string) => phrasesMap.get(key) || defaultValue;

  // Currency Formatter (server-side for initial render)
  const formatCurrency = (amount: number) => {
    const symbol = businessSettings?.currency_symbol || '$';
    const position = businessSettings?.currency_position || 'prefix';
    const formattedAmount = Number(amount).toFixed(2);
    return position === 'prefix' ? `${symbol}${formattedAmount}` : `${formattedAmount}${symbol}`;
  };

  // Date Formatter
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateFormat = businessSettings?.date_format || 'YYYY-MM-DD';

    try {
      let formatString = 'yyyy-MM-dd HH:mm:ss';
      switch(dateFormat) {
        case 'YYYY-MM-DD': formatString = 'yyyy-MM-dd'; break;
        case 'MM/DD/YYYY': formatString = 'MM/dd/yyyy'; break;
        case 'DD/MM/YYYY': formatString = 'dd/MM/yyyy'; break;
        default: break;
      }
      return format(date, formatString);
    } catch (e) {
      console.error("Date formatting error with date-fns, falling back:", e);
      return date.toLocaleString();
    }
  };

  // Calculate Total Units Sold
  const totalUnitsSold = sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);


  return (
    <div className="p-4 print:p-0">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg print:shadow-none print:rounded-none">
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              {businessSettings?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element -- Required for print compatibility
                <img src={businessSettings.logo_url} alt="Business Logo" className="h-16 mb-2" />
              )}
              <h1 className="text-2xl font-bold text-gray-800">{businessSettings?.business_name || 'Your Business Name'}</h1>
              <p className="text-sm text-gray-600">{businessSettings?.address_line1}</p>
              {businessSettings?.address_line2 && <p className="text-sm text-gray-600">{businessSettings.address_line2}</p>}
              <p className="text-sm text-gray-600">{businessSettings?.city}, {businessSettings?.state_province ? `${businessSettings.state_province}, ` : ''}{businessSettings?.zip_postal_code}</p>
              <p className="text-sm text-gray-600">{businessSettings?.country}</p>
              <p className="text-sm text-gray-600">Email: {businessSettings?.email || 'N/A'}</p>
              <p className="text-sm text-gray-600">Phone: {businessSettings?.phone_number || 'N/A'}</p>
              <p className="text-sm text-gray-600">Tax No: {businessSettings?.tax_number || 'N/A'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold text-gray-800">RECEIPT</h2>
              <p className="text-lg font-medium text-gray-700">{sale.transaction_reference}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(sale.sale_date)}</p>
              <p className="text-sm text-gray-600">Cashier: {sale.users?.email || 'N/A'}</p>
              <p className="text-sm text-gray-600">Branch: {sale.branches?.name || 'N/A'}</p>
            </div>
          </div>

          <div className="border-t border-b border-gray-300 py-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Items</h3>
            <Table className="w-full text-left table-fixed">
              <TableHeader>
                <TableRow className="bg-gray-100"><TableHead className="w-[5%]">SN</TableHead><TableHead className="w-[35%]">Product</TableHead><TableHead className="w-[10%] text-center">Qty</TableHead><TableHead className="w-[10%] text-center">Unit</TableHead><TableHead className="w-[15%] text-right">Unit Price</TableHead><TableHead className="w-[25%] text-right">Line Total</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {sale.sale_items.length > 0 ? (
                  sale.sale_items.map((item: SaleItemForReceipt, idx: number) => (
                    <React.Fragment key={item.id}>
                      <TableRow className="border-b border-gray-200"><TableCell className="text-sm">{idx + 1}</TableCell><TableCell className="font-medium text-gray-900">
                          {item.products?.name || 'N/A'} {item.products?.unique_reference && `(${item.products.unique_reference})`}
                          {item.note && <span className="block text-xs italic text-gray-500">Note: {item.note}</span>}
                        </TableCell><TableCell className="text-center">{item.quantity}</TableCell><TableCell className="text-center">{item.products?.units?.abbreviation || 'N/A'}</TableCell><TableCell className="text-right">{formatCurrency(item.unit_sale_price)}</TableCell><TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell></TableRow>
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-gray-500">No items found for this sale.</TableCell></TableRow>
                )}
                {/* Total Units Row */}
                <TableRow className="font-bold border-t border-gray-400"><TableCell colSpan={2} className="text-right py-2">Total Units Sold:</TableCell><TableCell className="text-center py-2">{totalUnitsSold}</TableCell><TableCell colSpan={2} className="text-right py-2">Total Amount:</TableCell><TableCell className="text-right py-2">{formatCurrency(sale.total_amount)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="text-center text-gray-700 text-sm mt-8">
            <p className="mb-1">{getPhrase('thank_you_message', 'Thank you for your purchase!')}</p>
            <p>{getPhrase('visit_again_message', 'We hope to see you again soon!')}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center p-4 print:hidden">
        <PrintButtonClient />
      </div>
    </div>
  );
}