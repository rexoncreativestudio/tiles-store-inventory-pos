"use client";
import React, { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import type { SaleRecord, SaleRecordForEdit, ExternalSaleRecord, ExternalSaleItem, SaleItemDetails, ProductForSaleItem, UserForSelect, BranchForSelect } from "../types/sales";
import SaleEditModalClient from "./sale-edit-modal-client";
import ExternalSaleEditModalClient from "./external-sale-edit-modal-client";
import { supabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Props
type SalesMobileAccordionClientProps = {
  allSales: (SaleRecord | ExternalSaleRecord)[];
  page: number;
  itemsPerPage: number;
  branchesForSelect?: BranchForSelect[];
  productsForSelection?: ProductForSaleItem[];
  cashiersForSelect?: UserForSelect[];
  currentUserId?: any;
  onSaleSubmitted?: () => void; // Optional, for refresh after edits/deletes
};

// Helper
function getStatusColorClass(status: string, sale: SaleRecord | ExternalSaleRecord) {
  const isRegularSale = "sale_items" in sale;
  const externalSaleItems = isRegularSale ? [] : (sale as ExternalSaleRecord).external_sale_items ?? [];
  const hasZeroPurchasePrice =
    !isRegularSale &&
    externalSaleItems.some(item => item.unit_purchase_price_negotiated === 0);

  if (!isRegularSale && (status === "completed" || status === "held") && hasZeroPurchasePrice) {
    return "text-orange-500 font-medium";
  }
  switch (status) {
    case "completed":
      return "text-green-600 font-medium";
    case "held":
      return "text-yellow-600 font-medium";
    case "cancelled":
      return "text-red-600 font-medium";
    case "pending_approval":
      return "text-blue-600 font-medium";
    default:
      return "";
  }
}

export default function SalesMobileAccordionClient({
  allSales,
  page,
  itemsPerPage,
  branchesForSelect: _branchesForSelect = [],
  productsForSelection: _productsForSelection = [],
  cashiersForSelect: _cashiersForSelect = [],
  currentUserId: _currentUserId,
  onSaleSubmitted,
}: SalesMobileAccordionClientProps) {
  const router = useRouter();
  const [detailsOpenId, setDetailsOpenId] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<string | undefined>(undefined);

  // State for edit modals
  const [editSale, setEditSale] = useState<SaleRecordForEdit | null>(null);
  const [editExternalSale, setEditExternalSale] = useState<ExternalSaleRecord | null>(null);

  // State for delete confirmation
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);

  // Delete logic
  const handleDelete = async (sale: SaleRecord | ExternalSaleRecord) => {
    if (!window.confirm("Are you sure you want to delete this sale?")) return;
    let error: Error | null = null;
    if ("sale_items" in sale) {
      // Regular sale
      const { error: delError } = await supabaseClient
        .from("sales")
        .delete()
        .eq("id", sale.id);
      error = delError;
    } else {
      // External sale
      const { error: delError } = await supabaseClient
        .from("external_sales")
        .delete()
        .eq("id", sale.id);
      error = delError;
    }
    if (error) {
      toast.error("Failed to delete sale.", { description: error.message });
    } else {
      toast.success("Sale deleted successfully!");
      if (onSaleSubmitted) onSaleSubmitted();
    }
    setDeleteSaleId(null);
  };

  return (
    <>
      {/* Edit Modals */}
      {editSale && (
        <SaleEditModalClient
          saleToEdit={editSale}
          products={_productsForSelection}
          cashiers={_cashiersForSelect}
          branches={_branchesForSelect}
          currentUserId={_currentUserId}
          isOpen={!!editSale}
          onClose={() => setEditSale(null)}
          onSaleSubmitted={() => {
            if (onSaleSubmitted) onSaleSubmitted();
            setEditSale(null);
          }}
        />
      )}
      {editExternalSale && (
        <ExternalSaleEditModalClient
          externalSaleToEdit={editExternalSale}
          isOpen={!!editExternalSale}
          onClose={() => setEditExternalSale(null)}
          onSaleSubmitted={() => {
            if (onSaleSubmitted) onSaleSubmitted();
            setEditExternalSale(null);
          }}
        />
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSaleId} onOpenChange={() => setDeleteSaleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this sale? This action cannot be undone.</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteSaleId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const sale = allSales.find(s => s.id === deleteSaleId);
                if (sale) handleDelete(sale);
              }}
            >
              Delete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Accordion type="single" collapsible value={expanded} onValueChange={setExpanded}>
        {allSales.map((sale, idx) => (
          <AccordionItem key={sale.id} value={String(sale.id)}>
            <AccordionTrigger className="!flex !flex-col !items-start !gap-1 !w-full">
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold text-gray-700">
                  {`${(page - 1) * itemsPerPage + idx + 1}. `}
                  {sale.transaction_reference}
                </span>
                <span className="text-xs text-gray-500">{new Date(sale.sale_date).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>Branch: {sale.branches?.name || "N/A"}</span>
                <span>Type: {"sale_items" in sale ? "Regular" : "External"}</span>
                <span>
                  Status:{" "}
                  <span className={getStatusColorClass(sale.status, sale)}>
                    {String(sale.status).toUpperCase()}
                  </span>
                </span>
              </div>
              <span className="text-xs text-gray-600">Total: {sale.total_amount}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-white rounded-lg shadow px-3 py-2">
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <div><span className="font-medium">Customer:</span> {sale.customer_name || "N/A"}</div>
                    <div><span className="font-medium">Payment:</span> {sale.payment_method}</div>
                    <div><span className="font-medium">Ref:</span> {sale.transaction_reference}</div>
                  </div>
                  <div>
                    <div><span className="font-medium">Branch:</span> {sale.branches?.name}</div>
                    <div><span className="font-medium">Sale Date:</span> {new Date(sale.sale_date).toLocaleString()}</div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      <span className={getStatusColorClass(sale.status, sale)}>
                        {String(sale.status).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setDetailsOpenId(sale.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if ("sale_items" in sale) {
                        setEditSale({
                          ...(sale as SaleRecordForEdit),
                          sale_items: sale.sale_items,
                        });
                      } else {
                        setEditExternalSale(sale as ExternalSaleRecord);
                      }
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if ("sale_items" in sale) {
                        router.push(`/receipt/${sale.transaction_reference}`);
                      } else {
                        router.push(`/receipt/external/${sale.transaction_reference}`);
                      }
                    }}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  {sale.status !== "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setDeleteSaleId(sale.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {/* Details Dialog */}
                <Dialog open={detailsOpenId === sale.id} onOpenChange={(open) => open ? setDetailsOpenId(sale.id) : setDetailsOpenId(undefined)}>
                  <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Sale Details: {sale.transaction_reference}</DialogTitle>
                    </DialogHeader>
                    <div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div>
                          <p><span className="font-semibold">Branch:</span> {sale.branches?.name}</p>
                          <p><span className="font-semibold">Customer:</span> {sale.customer_name || "Walk-in"}</p>
                          <p><span className="font-semibold">Sale Type:</span> {"sale_items" in sale ? "Regular" : "External"}</p>
                        </div>
                        <div>
                          <p><span className="font-semibold">Total Amount:</span> {sale.total_amount}</p>
                          <p><span className="font-semibold">Payment Method:</span> {sale.payment_method}</p>
                          <p>
                            <span className="font-semibold">Status:</span>{" "}
                            <span className={getStatusColorClass(sale.status, sale)}>
                              {String(sale.status).toUpperCase()}
                            </span>
                          </p>
                          <p><span className="font-semibold">Transaction Ref:</span> {sale.transaction_reference}</p>
                        </div>
                      </div>
                      {/* --- Sale Items Section --- */}
                      <div className="mt-6">
                        <h3 className="font-bold text-gray-700 mb-2">Items</h3>
                        {"sale_items" in sale && sale.sale_items?.length ? (
                          <table className="w-full text-xs mb-2 bg-gray-50 rounded shadow">
                            <thead>
                              <tr>
                                <th className="p-2 text-left">Product</th>
                                <th className="p-2 text-right">Qty</th>
                                <th className="p-2 text-right">Unit Price</th>
                                <th className="p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(sale.sale_items as SaleItemDetails[]).map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-2">{item.products?.name || "N/A"}</td>
                                  <td className="p-2 text-right">{item.quantity}</td>
                                  <td className="p-2 text-right">{item.unit_sale_price}</td>
                                  <td className="p-2 text-right">{item.total_price}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                        {"external_sale_items" in sale && sale.external_sale_items?.length ? (
                          <table className="w-full text-xs mb-2 bg-gray-50 rounded shadow">
                            <thead>
                              <tr>
                                <th className="p-2 text-left">Product</th>
                                <th className="p-2 text-right">Qty</th>
                                <th className="p-2 text-right">Unit Price</th>
                                <th className="p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(sale.external_sale_items as ExternalSaleItem[]).map((item, idx) => (
                                <tr key={idx}>
                                  <td className="p-2">{item.product_name || "N/A"}</td>
                                  <td className="p-2 text-right">{item.quantity}</td>
                                  <td className="p-2 text-right">{item.unit_sale_price}</td>
                                  <td className="p-2 text-right">{item.total_price}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setDetailsOpenId(undefined)}>Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}