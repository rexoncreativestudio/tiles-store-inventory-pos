"use client";

import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import PrintButtonClient from '../print-button-client';
import { useCurrencyFormatter } from '@/lib/formatters';

// --- BEGIN: Number to Words Utility ---
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];
function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  if (num > 999999999) return num.toLocaleString(); // fallback for huge numbers

  function helper(n: number): string {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + helper(n % 100) : '');
    if (n < 1000000) return helper(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + helper(n % 1000) : '');
    if (n < 1000000000) return helper(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + helper(n % 1000000) : '');
    return '';
  }
  return helper(num);
}
// --- END: Number to Words Utility ---

type BusinessSettings = {
  id: string; business_name: string; address_line1: string; address_line2: string | null;
  email: string | null; phone_number: string | null; tax_number: string | null; logo_url: string | null;
  receipt_prefix: string; date_format: string; currency_symbol: string; currency_position: 'prefix' | 'suffix';
  default_receipt_language: 'en' | 'fr';
};

type CommonSaleItemForDisplay = {
  id: string;
  quantity: number;
  unit_sale_price: number;
  total_price: number;
  note: string | null;
  product_name_display: string;
  product_unit_display: string;
};

type CommonSaleRecordForDisplay = {
  id: string;
  sale_date: string;
  transaction_reference: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: string;
  cashier_email: string;
  branch_name: string;
  sale_type: string;
  items: CommonSaleItemForDisplay[];
};

interface ReceiptDisplayClientProps {
  sale: CommonSaleRecordForDisplay;
  businessSettings: BusinessSettings | null;
}

export default function ReceiptDisplayClient({ sale, businessSettings }: ReceiptDisplayClientProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'yyyy-MM-dd HH:mm');
  };
  const totalItemCount = useMemo(() => sale.items.reduce((sum, item) => sum + item.quantity, 0), [sale.items]);
  const amountInWords = `${numberToWords(sale.total_amount)}`.replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="receipt-root p-8 print:p-0 font-sans text-black bg-white">
      {/* HEADER */}
      <div className="flex flex-row justify-between items-start mb-4 gap-2">
        {/* Business Info Left */}
        <div className="flex flex-col items-start min-w-[220px] max-w-[420px]">
          <div className="receipt-heading">{businessSettings?.business_name}</div>
          {/* REMOVED Trusted Partner in Tiles and Vanities from here */}
          <div>
            <span className="font-bold">Address: </span>
            {businessSettings?.address_line1}
            {businessSettings?.address_line2 && `, ${businessSettings.address_line2}`}
          </div>
          {businessSettings?.phone_number && (
            <div>
              <span className="font-bold">Phone: </span>
              {businessSettings.phone_number}
            </div>
          )}
          <div>
            <span className="font-bold">Branch: </span>
            {sale.branch_name}
          </div>
          {businessSettings?.tax_number && (
            <div>
              <span className="font-bold">NIU: </span>
              {businessSettings.tax_number}
            </div>
          )}
        </div>
        {/* Logo Center (optional) */}
        <div className="flex-1 flex flex-col items-center justify-start">
          {businessSettings?.logo_url && (
            <Image
              src={businessSettings.logo_url}
              alt="Business Logo"
              width={100}
              height={60}
              className="mb-1 receipt-logo-img"
            />
          )}
        </div>
        {/* Sale Details Right */}
        <div className="flex flex-col items-end min-w-[220px] max-w-[320px]">
          <div><span className="font-bold">No:</span> {sale.transaction_reference}</div>
          <div><span className="font-bold">Date:</span> {formatDate(sale.sale_date)}</div>
          <div><span className="font-bold">Status:</span> {sale.status?.toUpperCase()}</div>
          <div>
            <span className="font-bold">Customer:</span> {sale.customer_name || 'Walk-in'}
          </div>
          <div>
            <span className="font-bold">Phone:</span> {sale.customer_phone ? sale.customer_phone : '-'}
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="my-4">
        <table className="w-full border border-black border-collapse">
          <thead>
            <tr>
              <th className="border border-black py-2 px-2 text-center font-semibold">SN</th>
              <th className="border border-black py-2 px-2 font-semibold">Item Description</th>
              <th className="border border-black py-2 px-2 text-center font-semibold">U.P</th>
              <th className="border border-black py-2 px-2 text-center font-semibold">Qty</th>
              <th className="border border-black py-2 px-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <React.Fragment key={item.id}>
                <tr>
                  <td className="border border-black py-2 px-2 text-center">{idx + 1}</td>
                  <td className="border border-black py-2 px-2">
                    {item.product_name_display}
                    {item.note && <div className="block italic text-gray-500">Note: {item.note}</div>}
                  </td>
                  <td className="border border-black py-2 px-2 text-center">{formatCurrency(item.unit_sale_price)}</td>
                  <td className="border border-black py-2 px-2 text-center">{item.quantity} {item.product_unit_display}</td>
                  <td className="border border-black py-2 px-2 text-right">{formatCurrency(item.total_price)}</td>
                </tr>
              </React.Fragment>
            ))}
            {/* Totals Row: Qty total and Subtotal total on the same line */}
            <tr className="font-bold border-t border-black">
              <td className="border border-black py-2 px-2 text-center" colSpan={3}></td>
              <td className="border border-black py-2 px-2 text-center">{totalItemCount}</td>
              <td className="border border-black py-2 px-2 text-right">{formatCurrency(sale.total_amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words, Total Payable, Paid Amount */}
      <div className="flex flex-row items-center justify-between my-4 font-semibold">
        <span><b>Amount In Words:</b> {amountInWords}</span>
        <span><b>Total Payable:</b> {formatCurrency(sale.total_amount)}</span>
        <span><b>Paid Amount:</b> {formatCurrency(sale.total_amount)}</span>
      </div>

      {/* Signature Lines - evenly spaced, with line above */}
      <div className="flex flex-row justify-between items-end mt-14 mb-4">
        <div className="w-1/3 flex flex-col items-center">
          <div className="border-t border-black w-4/5 mb-2"></div>
          <div className="text-center">Customer Signature</div>
        </div>
        <div className="w-1/3 flex flex-col items-center">
          <div className="border-t border-black w-4/5 mb-2"></div>
          <div className="text-center">Warehouse Keeper Signature</div>
        </div>
        <div className="w-1/3 flex flex-col items-center">
          <div className="border-t border-black w-4/5 mb-2"></div>
          <div className="text-center">Cashiers Signature</div>
        </div>
      </div>

      {/* Thank You */}
      <div className="mt-4 text-center font-bold receipt-heading">
        {businessSettings?.business_name || "our business"}
      </div>
      <div className="text-center text-[15px] font-semibold mb-2">
        Trusted Partner in Tiles and Vanities
      </div>

      {/* Print Button */}
      <div className="flex justify-center p-4 print:hidden">
        <PrintButtonClient />
      </div>
    </div>
  );
} 