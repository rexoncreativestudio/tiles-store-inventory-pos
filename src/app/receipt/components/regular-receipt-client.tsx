// src/app/receipt/components/regular-receipt-client.tsx
"use client";

import React from 'react'; // <-- Removed useMemo
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
import { useCurrencyFormatter } from '@/lib/formatters';
import Image from 'next/image';

// --- Type Definitions (local copies for clarity, but align with external/types.ts) ---
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
};

type SaleItemForReceipt = {
  id: string; sale_id: string; product_id: string; quantity: number; unit_sale_price: number;
  total_price: number; note: string | null;
  products: ProductForSaleItem | null;
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

interface RegularReceiptClientProps {
    sale: SaleRecordForReceipt;
    businessSettings: BusinessSettings | null;
}

export default function RegularReceiptClient({ sale, businessSettings }: RegularReceiptClientProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateFormat = businessSettings?.date_format || 'yyyy-MM-DD';

    try {
      let formatString = 'yyyy-MM-DD HH:mm:ss';
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

  const totalUnitsSold = sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-4 print:p-0">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg print:shadow-none print:rounded-none">
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              {businessSettings?.logo_url && (
                <Image src={businessSettings.logo_url} alt="Business Logo" width={100} height={40} className="h-16 w-auto mb-2" />
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
              <h2 className="text-xl font-semibold text-gray-800">SALES RECEIPT</h2>
              <p className="text-lg font-medium text-gray-700">{sale.transaction_reference}</p>
              <p className="text-sm text-gray-600">Date: {formatDate(sale.sale_date)}</p>
              <p className="text-sm text-gray-600">Cashier: {sale.users?.email || 'N/A'}</p>
              <p className="text-sm text-gray-600">Branch: {sale.branches?.name || 'N/A'}</p>
              <p className="text-sm text-gray-600">Status: {sale.status.toUpperCase()}</p>
            </div>
          </div>

          <div className="border-t border-b border-gray-300 py-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Items</h3>
            <Table className="w-full text-left table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]">SN</TableHead>
                  <TableHead className="w-[45%]">Product</TableHead>
                  <TableHead className="w-[10%] text-center">Qty</TableHead>
                  <TableHead className="w-[10%] text-center">Unit</TableHead>
                  <TableHead className="w-[15%] text-right">Unit Price</TableHead>
                  <TableHead className="w-[15%] text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.sale_items.length > 0 ? (
                  sale.sale_items.map((item: SaleItemForReceipt, idx: number) => (
                    <React.Fragment key={item.id}>
                      <TableRow className="border-b border-gray-200">
                        <TableCell className="text-sm">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {item.products?.name} ({item.products?.unique_reference})
                          {item.note && <span className="block text-xs italic text-gray-500">Note: {item.note}</span>}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.products?.product_unit_abbreviation || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_sale_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center">No items found for this sale.</TableCell>
                  </TableRow>
                )}
                <TableRow className="font-bold border-t border-gray-400">
                    <TableCell colSpan={2} className="text-right py-2">Total Units Sold:</TableCell>
                    <TableCell className="text-center py-2">{totalUnitsSold}</TableCell>
                    <TableCell colSpan={3} className="text-right py-2">Total Amount:</TableCell>
                    <TableCell className="text-right py-2">{formatCurrency(sale.total_amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mb-6 text-lg font-bold">
            <div className="w-full md:w-1/2">
              <div className="flex justify-between border-b pb-2 mb-2">
                <span>Amount Paid:</span>
                <span>{formatCurrency(sale.total_amount)}</span>
              </div>
              <div className="flex justify-between text-2xl">
                <span>Change Due:</span>
                <span>{formatCurrency(0)}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-700 text-sm mt-8">
            <p className="mb-1">Thank you for your purchase!</p>
            <p>We hope to see you again soon!</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center p-4 print:hidden">
        <PrintButtonClient />
      </div>
    </div>
  );
} 