"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  TableRow,
  TableCell,
  Table,
  TableBody,
  TableHeader,
  TableHead,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Eye, Pencil, Printer, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SaleEditModalClient from './components/sale-edit-modal-client';
import ExternalSaleEditModalClient from './components/external-sale-edit-modal-client';
import { useCurrencyFormatter } from '@/lib/formatters';
import { supabaseClient } from '@/lib/supabase/client';
import { toast } from "sonner";

import type {
  SaleRecord,
  ExternalSaleRecord,
  ProductForSaleItem,
  SaleRecordForEdit,
  ExternalSaleItem,
} from './types/sales';

type BranchForSelect = { id: string; name: string };
type CashierForSelect = { id: string; email: string };

interface SaleTableRowClientProps {
  sale: SaleRecord | ExternalSaleRecord;
  idx: number;
  allBranches: BranchForSelect[];
  allProducts: ProductForSaleItem[];
  allCashiers: CashierForSelect[];
  currentUserId: string;
}

export default function SaleTableRowClient({
  sale,
  idx,
  allBranches,
  allProducts,
  allCashiers,
  currentUserId,
}: SaleTableRowClientProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const router = useRouter();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExternalEditDialogOpen, setIsExternalEditDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const isRegularSale = 'sale_items' in sale;
  const saleItems = isRegularSale ? (sale as SaleRecord).sale_items : [];
  const externalSaleItems = !isRegularSale ? (sale as ExternalSaleRecord).external_sale_items : [];

  const viewDetails = () => setIsDetailsDialogOpen(true);
  const editSale = () => setIsEditDialogOpen(true);
  const editExternalSale = () => setIsExternalEditDialogOpen(true);
  const handleModalClose = () => {
    setIsDetailsDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsExternalEditDialogOpen(false);
  };
  const handleSaleSubmitted = () => {
    setIsEditDialogOpen(false);
    setIsExternalEditDialogOpen(false);
  };
  const reprintReceipt = () => {
    if (isRegularSale) {
      router.push(`/receipt/${sale.transaction_reference}`);
    } else {
      router.push(`/receipt/external/${sale.transaction_reference}`);
    }
  };

  // External sales: Check if completed or held and any item has unit_purchase_price_negotiated === 0
  const hasZeroPurchasePrice =
    !isRegularSale &&
    externalSaleItems.some(item => item.unit_purchase_price_negotiated === 0);

  const getStatusColorClass = (status: string) => {
    if (!isRegularSale && (status === 'completed' || status === 'held') && hasZeroPurchasePrice) {
      return 'text-orange-500 font-medium';
    }
    switch (status) {
      case 'completed': return 'text-green-600 font-medium';
      case 'held': return 'text-yellow-600 font-medium';
      case 'cancelled': return 'text-red-600 font-medium';
      case 'pending_approval': return 'text-blue-600 font-medium';
      default: return '';
    }
  };

  const formattedSaleDate = new Date(sale.sale_date).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  // Branch logic (just branch name, no employee)
  const branchName = sale.branches?.name || 'N/A';

  // Sale Type logic
  const saleType = isRegularSale ? 'Regular' : 'External';

  // Cancel Sale Handler (uses in-app modal dialog for confirmation)
  const openCancelDialog = () => setIsCancelDialogOpen(true);
  const closeCancelDialog = () => setIsCancelDialogOpen(false);

  const handleCancelSale = async () => {
    setIsCancelling(true);

    // Clean IDs in case they're wrapped in braces
    const cleanSaleId = typeof sale.id === "string" ? sale.id.replace(/[{}]/g, "") : sale.id;
    const cleanUserId = typeof currentUserId === "string" ? currentUserId.replace(/[{}]/g, "") : currentUserId;

    const rpcFunc = isRegularSale ? "cancel_regular_sale" : "cancel_external_sale";
    const params = isRegularSale
      ? { p_sale_id: cleanSaleId, p_user_id: cleanUserId }
      : { p_external_sale_id: cleanSaleId };

    // Log parameters before calling RPC
    console.log("Attempting to cancel sale:", { rpcFunc, params });

    const { data, error } = await supabaseClient.rpc(rpcFunc, params);

    // Log the RPC result for debugging
    console.log("Cancel result:", { data, error });

    setIsCancelling(false);
    setIsCancelDialogOpen(false);

    // Feedback via toast
    if (error) {
      toast.error("Error cancelling sale: " + error.message);
    } else if (data?.status === "success") {
      toast.success("Sale cancelled successfully!");
      router.refresh();
    } else {
      toast.error(data?.message || "Unknown error occurred during cancellation.");
    }
  };

  return (
    <TableRow key={sale.id}>
      <TableCell>{idx + 1}</TableCell>
      <TableCell>{formattedSaleDate}</TableCell>
      <TableCell className="font-medium">{sale.transaction_reference}</TableCell>
      <TableCell>{branchName}</TableCell>
      <TableCell>{saleType}</TableCell>
      <TableCell>{sale.customer_name || 'N/A'}</TableCell>
      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
      <TableCell>
        <span className={getStatusColorClass(sale.status)}>
          {String(sale.status).toUpperCase()}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={viewDetails} title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          {/* Regular Sale: always show Edit. External: show for completed or held */}
          {isRegularSale && (
            <Button variant="outline" size="sm" onClick={editSale} title="Edit Sale">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {!isRegularSale && (sale.status === 'completed' || sale.status === 'held') && (
            <Button variant="outline" size="sm" onClick={editExternalSale} title="Edit External Sale">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={reprintReceipt} title="Reprint Receipt">
            <Printer className="h-4 w-4" />
          </Button>
          {/* Cancel Sale Button - only if not already cancelled */}
          {sale.status !== 'cancelled' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={openCancelDialog}
                title="Cancel Sale"
                className="text-red-600"
                disabled={isCancelling}
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Cancel Sale</span>
              </Button>
              <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Sale</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel this sale? This will reverse the stock, delete the sale and its payment receipt. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={closeCancelDialog}
                      disabled={isCancelling}
                    >
                      No, Keep Sale
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelSale}
                      disabled={isCancelling}
                    >
                      Yes, Cancel Sale
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </TableCell>

      {/* Sale Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details: {sale.transaction_reference}</DialogTitle>
            <DialogDescription>
              Details of the sale recorded on {formattedSaleDate}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p><span className="font-semibold">Branch:</span> {branchName}</p>
              <p><span className="font-semibold">Customer:</span> {sale.customer_name || 'Walk-in'}</p>
              <p><span className="font-semibold">Customer Phone:</span> {sale.customer_phone || 'N/A'}</p>
              <p><span className="font-semibold">Sale Type:</span> {saleType}</p>
            </div>
            <div>
              <p><span className="font-semibold">Total Amount:</span> {formatCurrency(sale.total_amount)}</p>
              <p><span className="font-semibold">Payment Method:</span> {sale.payment_method}</p>
              <p><span className="font-semibold">Status:</span> <span className={getStatusColorClass(sale.status)}>{String(sale.status).toUpperCase()}</span></p>
              <p><span className="font-semibold">Transaction Ref:</span> {sale.transaction_reference}</p>
            </div>
          </div>

          {isRegularSale ? (
            <>
              <h3 className="text-lg font-semibold mt-6 mb-3">Items Sold</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.length > 0 ? (
                    saleItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-gray-900">
                          {item.products?.name || 'N/A'}
                          {item.products?.unique_reference ? (
                            <> (<span className="text-xs text-gray-500">{item.products.unique_reference}</span>)</>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.products?.product_unit_abbreviation || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_sale_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                        <TableCell>{item.note || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-16 text-center text-gray-500">No items found for this sale.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mt-6 mb-3">External Sale Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Sale Price</TableHead>
                    <TableHead>Unit Purchase Price</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {externalSaleItems.length > 0 ? (
                    externalSaleItems.map((item: ExternalSaleItem) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.product_unit_name}</TableCell>
                        <TableCell>{formatCurrency(item.unit_sale_price)}</TableCell>
                        <TableCell>{formatCurrency(item.unit_purchase_price_negotiated)}</TableCell>
                        <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                        <TableCell>{formatCurrency(item.total_price)}</TableCell>
                        <TableCell>{item.note || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-16 text-center text-gray-500">No items found for this external sale.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}

          <DialogFooter>
            <Button onClick={handleModalClose}>Close</Button>
            <Button onClick={reprintReceipt}><Printer className="h-4 w-4 mr-2" /> Reprint Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Edit Modal (Regular Sales Only) */}
      {isRegularSale && (
        <SaleEditModalClient
          isOpen={isEditDialogOpen}
          onClose={handleModalClose}
          onSaleSubmitted={handleSaleSubmitted}
          saleToEdit={sale as SaleRecordForEdit}
          products={allProducts}
          branches={allBranches}
          cashiers={allCashiers}
          currentUserId={currentUserId}
        />
      )}

      {/* External Sale Edit Modal (Completed or Held External Sales Only) */}
      {!isRegularSale && (sale.status === 'completed' || sale.status === 'held') && (
        <ExternalSaleEditModalClient
          isOpen={isExternalEditDialogOpen}
          onClose={handleModalClose}
          onSaleSubmitted={handleSaleSubmitted}
          externalSaleToEdit={sale as ExternalSaleRecord}
        />
      )}
    </TableRow>
  );
} 