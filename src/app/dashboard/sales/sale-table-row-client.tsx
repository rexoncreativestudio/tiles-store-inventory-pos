// src/app/dashboard/sales/sale-table-row-client.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCurrencyFormatter } from '@/lib/formatters';
import { Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Re-define types for clarity within component
type SaleItemDetails = {
    id: string;
    product_id: string;
    quantity: number;
    unit_sale_price: number;
    total_price: number;
    note: string | null;
    products: {
      id: string;
      name: string;
      unique_reference: string;
    } | null;
  };

type SaleRecord = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'held' | 'cancelled';
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    email: string;
  } | null;
  branches: {
    id: string;
    name: string;
  } | null;
  sale_items: SaleItemDetails[];
};

interface SaleTableRowClientProps {
  sale: SaleRecord;
  idx: number;
}

export default function SaleTableRowClient({ sale, idx }: SaleTableRowClientProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const router = useRouter();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const viewDetails = () => {
    setIsDetailsDialogOpen(true);
  };

  const reprintReceipt = () => {
    router.push(`/receipt/${sale.transaction_reference}`);
  };

  const getStatusColorClass = (status: 'completed' | 'held' | 'cancelled') => {
    switch (status) {
      case 'completed': return 'text-green-600 font-medium';
      case 'held': return 'text-yellow-600 font-medium';
      case 'cancelled': return 'text-red-600 font-medium';
      default: return '';
    }
  };

  const formattedSaleDate = new Date(sale.sale_date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <TableRow key={sale.id}> {/* CORRECTED: Ensure no whitespace immediately after <TableRow> */}
      <TableCell>{idx + 1}</TableCell>
      <TableCell>{formattedSaleDate}</TableCell>
      <TableCell className="font-medium">{sale.transaction_reference}</TableCell>
      <TableCell>{sale.users?.email || 'N/A'}</TableCell>
      <TableCell>{sale.branches?.name || 'N/A'}</TableCell>
      <TableCell>{sale.customer_name || 'N/A'}</TableCell>
      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
      <TableCell><span className={getStatusColorClass(sale.status)}>{sale.status.toUpperCase()}</span></TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={viewDetails}>View Details</Button>
          <Button variant="outline" size="sm" onClick={reprintReceipt}><Printer className="h-4 w-4" /></Button>
        </div>
      </TableCell>

      {/* Sale Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details: {sale.transaction_reference}</DialogTitle>
            <DialogDescription>
              Details of the sale recorded on {new Date(sale.sale_date).toLocaleString('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
              })}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p><span className="font-semibold">Cashier:</span> {sale.users?.email || 'N/A'}</p>
              <p><span className="font-semibold">Branch:</span> {sale.branches?.name || 'N/A'}</p>
              <p><span className="font-semibold">Customer:</span> {sale.customer_name || 'Walk-in'}</p>
              <p><span className="font-semibold">Customer Phone:</span> {sale.customer_phone || 'N/A'}</p>
            </div>
            <div>
              <p><span className="font-semibold">Total Amount:</span> {formatCurrency(sale.total_amount)}</p>
              <p><span className="font-semibold">Payment Method:</span> {sale.payment_method}</p>
              <p><span className="font-semibold">Status:</span> <span className={getStatusColorClass(sale.status)}>{sale.status.toUpperCase()}</span></p>
              <p><span className="font-semibold">Transaction Ref:</span> {sale.transaction_reference}</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-3">Items Sold</h3>
          <Table>
            <TableHeader>
              <TableRow> {/* CORRECTED: No whitespace immediately after <TableRow> */}
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.sale_items && sale.sale_items.length > 0 ? (
                sale.sale_items.map(item => (
                  <React.Fragment key={item.id}>
                    <TableRow className="border-b border-gray-200"> {/* CORRECTED: No whitespace after <TableRow> */}
                      <TableCell className="font-medium text-gray-900">{item.products?.name || 'N/A'}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_sale_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                      <TableCell>{item.note || 'N/A'}</TableCell>
                    </TableRow>
                    {item.note && (
                      <TableRow className="bg-gray-50 text-gray-600"> {/* CORRECTED: No whitespace after <TableRow> */}
                        <TableCell colSpan={5} className="py-1 px-4 text-sm italic">Note: {item.note}</TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow> {/* CORRECTED: No whitespace after <TableRow> */}
                  <TableCell colSpan={5} className="h-16 text-center text-gray-500">No items found for this sale.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
            <Button onClick={reprintReceipt}><Printer className="h-4 w-4 mr-2" /> Reprint Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
}