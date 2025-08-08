"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  XCircle, Search, Loader2, ReceiptText, RefreshCw, LogOut, History, Calculator,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabase/client";

// Import useForm and SubmitHandler from react-hook-form
import { useForm, SubmitHandler } from "react-hook-form";
// Import zodResolver from @hookform/resolvers/zod
import { zodResolver } from "@hookform/resolvers/zod";

import {
  CategoryForPos,
  ProductForPos,
  ProductStockDetail,
  CartItem,
  externalSaleFormSchema,
  ExternalSaleFormValues,
  SaleRecordForRecentSales,
  WarehouseSelection,
  ExpenseCategoryForPos,
  ExpenseRecordForPos,
  BranchForFilter,
} from "./types";

import RecentSalesModalClient from './components/recent-sales-modal-client';
import ProductCardClient from './product-card-client';
import ExpensesReviewModalClient from './components/expenses-review-modal-client';
import TilesCalculatorDialog from './components/tiles-calculator-dialog';
import ExternalSaleDialog from './components/external-sale-dialog';
import AddToCartDialog, { WarehouseDeduction } from './components/add-to-cart-dialog';

// Payment Dialog import (corrected props)
import PosInterfaceClientPaymentDialog from './components/pos-interface-client-payment-dialog';

// FIX: Changed 'date' type from string to Date to resolve the type mismatch
type PaymentFormValues = {
  amountReceived: number;
  customerName?: string;
  customerPhone?: string;
  status: "completed" | "held";
  date?: Date;
};

interface PosInterfaceClientProps {
  initialProducts: ProductForPos[];
  initialCategories: CategoryForPos[];
  currentCashierId: string;
  currentUserRole: string;
  currentUserBranchId: string;
  branches: BranchForFilter[];
  initialDetailedStock: ProductStockDetail[];
  initialRecentSales: SaleRecordForRecentSales[];
  initialExpensesForReview: ExpenseRecordForPos[];
  initialExpenseCategoriesForReview: ExpenseCategoryForPos[];
}

export default function PosInterfaceClient({
  initialProducts,
  initialCategories,
  currentCashierId,
  currentUserRole,
  currentUserBranchId,
  branches,
  initialDetailedStock,
  initialRecentSales,
  initialExpensesForReview,
  initialExpenseCategoriesForReview,
}: PosInterfaceClientProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>("all");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productDetailedStock, setProductDetailedStock] = useState<Record<string, ProductStockDetail[]>>({});
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // External Sale Dialog state
  const [isExternalSaleDialogOpen, setIsExternalSaleDialogOpen] = useState(false);

  // Modals for Header Actions (Recent Sales, Calculator, Expenses Review)
  const [isRecentSalesModalOpen, setIsRecentSalesModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isExpensesReviewModalOpen, setIsExpensesReviewModalOpen] = useState(false);

  // State for AddToCartDialog
  const [addToCartOpen, setAddToCartOpen] = useState(false);
  const [selectedProductForAddToCart, setSelectedProductForAddToCart] = useState<ProductForPos | null>(null);
  const [initialQtyForAddToCart, setInitialQtyForAddToCart] = useState(1);
  const [initialNoteForAddToCart, setInitialNoteForAddToCart] = useState("");

  useEffect(() => {
    const stockMap: Record<string, ProductStockDetail[]> = {};
    for (const stock of initialDetailedStock) {
      if (!stockMap[stock.product_id]) stockMap[stock.product_id] = [];
      stockMap[stock.product_id].push(stock);
    }
    setProductDetailedStock(stockMap);
  }, [initialDetailedStock]);

  // FIX: Changed default value for 'date' to a Date object
  const paymentForm = useForm<PaymentFormValues>({
    defaultValues: { amountReceived: 0, customerName: "", customerPhone: "", status: "completed", date: new Date() },
  });

  const externalSaleForm = useForm({
    resolver: zodResolver(externalSaleFormSchema),
    defaultValues: {
      customerName: "Walk-in Customer",
      customerPhone: "",
      items: [],
      status: "completed",
      date: new Date(),
    },
  });

  const subtotal = useMemo(
    () => cart.reduce((sum: number, item: CartItem) => sum + item.total_line_price, 0),
    [cart]
  );
  const grandTotal = subtotal;

  const filteredProducts = useMemo(() => {
    let productsToDisplay = initialProducts;

    if (activeCategory && activeCategory !== "all") {
      productsToDisplay = productsToDisplay.filter((p) => p.category_id === activeCategory);
    }

    if (productSearchQuery) {
      const lowerCaseQuery = productSearchQuery.toLowerCase();
      productsToDisplay = productsToDisplay.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerCaseQuery) ||
          p.unique_reference.toLowerCase().includes(lowerCaseQuery)
      );
    }
    return productsToDisplay;
  }, [initialProducts, activeCategory, productSearchQuery]);

  const getUnitForProduct = (productId: string) => {
    const product = initialProducts.find((p) => p.id === productId);
    if (!product) return "";
    const category = initialCategories.find((cat) => cat.id === product.category_id);
    return category?.unit_abbreviation || "";
  };

  const handleAddItemToCart = (product: ProductForPos) => {
    setSelectedProductForAddToCart(product);
    const existingCartItem = cart.find((item) => item.id === product.id);
    setInitialQtyForAddToCart(existingCartItem?.quantity || 1);
    setInitialNoteForAddToCart(existingCartItem?.note || "");
    setAddToCartOpen(true);
  };

  const handleAddToCartSubmit = ({
    qty,
    salePrice,
    selectedWarehouses,
    note,
  }: {
    qty: number;
    salePrice: number;
    selectedWarehouses: WarehouseDeduction[];
    note: string;
  }) => {
    if (!selectedProductForAddToCart) return;

    const totalAvailableStock = (productDetailedStock[selectedProductForAddToCart.id] || []).reduce(
      (sum: number, s: ProductStockDetail) => sum + s.quantity, 0
    );
    const totalDeductedQuantity = selectedWarehouses.reduce((sum, d) => sum + d.deducted, 0);

    if (totalDeductedQuantity !== qty) {
      toast.error("Total deducted quantity must match total required quantity.");
      return;
    }
    if (totalDeductedQuantity > totalAvailableStock) {
      toast.error(`Insufficient stock. Only ${totalAvailableStock} available for ${selectedProductForAddToCart.name}.`);
      return;
    }

    const warehouse_selections: WarehouseSelection[] = selectedWarehouses.map((d): WarehouseSelection => ({
      warehouse_id: d.id,
      warehouse_name: d.name,
      deducted_quantity: d.deducted,
    }));

    const newItem: CartItem = {
      id: selectedProductForAddToCart.id,
      name: selectedProductForAddToCart.name,
      unique_reference: selectedProductForAddToCart.unique_reference,
      quantity: qty,
      unit_sale_price: salePrice,
      total_line_price: qty * salePrice,
      image_url: selectedProductForAddToCart.image_url,
      warehouse_selections,
      note: note || undefined,
    };

    setCart((prevCart) => {
      const existingCartItemIndex = prevCart.findIndex(item => item.id === newItem.id);
      if (existingCartItemIndex !== -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingCartItemIndex] = newItem;
        return updatedCart;
      } else {
        return [...prevCart, newItem];
      }
    });

    setAddToCartOpen(false);
    setSelectedProductForAddToCart(null);
    toast.success(`${newItem.name} added/updated in cart.`);
  };

  const handleRemoveItem = (index: number) => {
    setCart((prevCart) => prevCart.filter((_: CartItem, i: number) => i !== index));
    toast.info("Item removed from cart.");
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Add items before proceeding to payment.");
      return;
    }
    setIsPaymentDialogOpen(true);
    // FIX: Updated the reset to use a Date object
    paymentForm.reset({ amountReceived: grandTotal, customerName: "", customerPhone: "", status: "completed", date: new Date() });
  };

  const onPaymentFormSubmit: SubmitHandler<PaymentFormValues> = async (values) => {
    setIsProcessingSale(true);

    if (values.amountReceived < grandTotal) {
      toast.error("Amount received is less than total amount due.");
      setIsProcessingSale(false);
      return;
    }
    const changeDue = values.amountReceived - grandTotal;
    if (changeDue < 0) {
      toast.error("Invalid change calculation.");
      setIsProcessingSale(false);
      return;
    }

    const stockDeductionPromises = cart.flatMap((item: CartItem) =>
      item.warehouse_selections.map(async (deduction: WarehouseSelection) => {
        const { error: adjustError } = await supabaseClient.rpc('adjust_stock_quantity', {
          p_product_id: item.id,
          p_warehouse_id: deduction.warehouse_id,
          p_quantity_change: -deduction.deducted_quantity,
          p_user_id: currentCashierId,
          p_reason: `Sale deduction from POS for ${item.name} (${deduction.deducted_quantity} from ${deduction.warehouse_name})`
        });
        if (adjustError) {
          console.error(`Error deducting stock for product ${item.name} from ${deduction.warehouse_name}:`, adjustError.message);
          throw new Error(`Stock deduction failed for ${item.name} from ${deduction.warehouse_name}.`);
        }
      })
    );

    try {
      await Promise.all(stockDeductionPromises);

      const { data: cashierProfile, error: cashierProfileError } = await supabaseClient
        .from("users")
        .select("branch_id")
        .eq("id", currentCashierId)
        .single();

      if (cashierProfileError || !cashierProfile?.branch_id) {
        throw new Error("Cashier's branch not found. Cannot finalize sale.");
      }
      const cashierBranchId = cashierProfile.branch_id;

      const { data: rpcResponseData, error: funcError } = await supabaseClient
        .rpc("process_sale_transaction", {
          sale_data: {
            // FIX: Use the Date object's toISOString() directly
            sale_date: values.date?.toISOString() || new Date().toISOString(),
            cashier_id: currentCashierId,
            branch_id: cashierBranchId,
            customer_name: values.customerName || "Walk-in Customer",
            customer_phone: values.customerPhone || null,
            total_amount: grandTotal,
            payment_method: "Cash",
            status: values.status,
            items: cart.map(item => ({
              product_id: item.id,
              quantity: item.quantity,
              unit_sale_price: item.unit_sale_price,
              total_price: item.total_line_price,
              note: item.note || "",
            })),
          },
        })
        .returns<{ transaction_reference: string; message: string }>();

      if (funcError) {
        throw new Error(funcError.message || "Failed to record sale.");
      }

      if (!rpcResponseData || !('transaction_reference' in rpcResponseData)) {
        throw new Error("Sale completed, but no transaction reference returned.");
      }
      const transactionRef = rpcResponseData.transaction_reference;
      toast.success(`Sale completed! Ref: ${transactionRef}`);
      setIsPaymentDialogOpen(false);
      setCart([]);
      router.push(`/receipt/${transactionRef}`);
      router.refresh();

    } catch (e: any) {
      toast.error("Sale processing failed.", {
        description: e.message || "An unknown error occurred during sale processing.",
      });
      console.error("Full sale processing error:", e);
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleExternalSaleSubmit = async (values: ExternalSaleFormValues) => {
    setIsProcessingSale(true);

    const saleItemsPayload = values.items.map((item) => ({
      product_name: item.product_name,
      product_category_name:
        initialCategories.find((cat) => cat.id === item.product_category_id)?.name || null,
      product_unit_name: item.product_unit_name,
      quantity: Number(item.quantity || 0),
      unit_sale_price: Number(item.unit_sale_price || 0),
      unit_purchase_price_negotiated: Number(item.unit_purchase_price_negotiated || 0),
      total_cost:
        Number(item.quantity || 0) * Number(item.unit_purchase_price_negotiated || 0),
      total_price: Number(item.quantity || 0) * Number(item.unit_sale_price || 0),
      note: item.note,
    }));

    const totalExternalSaleAmount = saleItemsPayload.reduce(
      (sum: number, item) => sum + item.total_price,
      0
    );

    const { data: cashierProfile, error: cashierProfileError } = await supabaseClient
      .from("users")
      .select("branch_id")
      .eq("id", currentCashierId)
      .single();

    if (cashierProfileError || !cashierProfile?.branch_id) {
      toast.error("Cashier's branch not found. Cannot finalize sale.");
      setIsProcessingSale(false);
      return;
    }
    const cashierBranchId = cashierProfile.branch_id;

    const externalTransactionRef = `EXT-${Date.now()}`;

    const { data: externalRpcResponseData, error: externalFuncError } =
      await supabaseClient.rpc("process_external_sale_transaction", {
        external_sale_data: {
          sale_date: new Date().toISOString(),
          cashier_id: currentCashierId,
          branch_id: cashierBranchId,
          customer_name: values.customerName,
          customer_phone: values.customerPhone || null,
          total_amount: totalExternalSaleAmount,
          payment_method: "Cash",
          status: "completed",
          authorized_by_user_id: null,
          authorization_code_hashed: null,
          transaction_reference: externalTransactionRef,
          items: saleItemsPayload,
        },
      }).returns<{ external_transaction_reference: string; message: string }>();

    if (externalFuncError) {
      toast.error("Failed to record external sale.", {
        description: (externalFuncError as unknown as Error)?.message || "Unknown error",
      });
      setIsProcessingSale(false);
      return;
    }

    if (!externalRpcResponseData || !('external_transaction_reference' in externalRpcResponseData)) {
      toast.error("External sale completed, but no transaction reference returned.");
      setIsProcessingSale(false);
      return;
    }
    const returnedTransactionRef = externalRpcResponseData.external_transaction_reference;
    toast.success(`External Sale completed! Ref: ${returnedTransactionRef}`);
    setIsExternalSaleDialogOpen(false);
    setCart([]);
    externalSaleForm.reset();
    router.push(`/receipt/external/${returnedTransactionRef}`);
    router.refresh();
    setIsProcessingSale(false);
  };

  // Logout Handler
  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    window.location.reload();
    toast.success("Page refreshed!");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header (with top left and right controls) */}
      <header className="w-full bg-white border-b shadow-sm p-4 flex items-center justify-between">
        {/* Left group: Expenses, Recent Sales, Calculator */}
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => setIsExpensesReviewModalOpen(true)}
            title="Expenses Review"
            className="flex gap-2 items-center"
          >
            <ReceiptText className="h-4 w-4" />
            Expenses
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsRecentSalesModalOpen(true)}
            title="Recent Sales"
            className="flex gap-2 items-center"
          >
            <History className="h-4 w-4" />
            Recent Sales
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCalculatorOpen(true)}
            title="Tiles Pricing Calculator"
            className="flex gap-2 items-center"
          >
            <Calculator className="h-4 w-4" />
            Calculator
          </Button>
        </div>

        {/* Right group: Refresh, Logout */}
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            title="Refresh Page"
            className="flex gap-2 items-center"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            title="Logout"
            className="flex gap-2 items-center"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Cart Section */}
        <div className="md:w-2/5 p-4 flex flex-col bg-white border-r shadow-md h-full min-h-0 relative">
          <h2 className="text-2xl font-bold mb-4">Cart</h2>
          <div className="flex-grow overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length > 0 ? (
                  cart.map((item: CartItem, index: number) => (
                    <TableRow key={item.id + (item.warehouse_selections?.map(ws => ws.warehouse_id).join("_") || "")}>
                      <TableCell className="font-medium">
                        {item.name}
                        {item.note && <span className="block text-xs italic text-gray-500">Note: {item.note}</span>}
                      </TableCell>
                      <TableCell>{getUnitForProduct(item.id)}</TableCell>
                      <TableCell>
                        {item.quantity}
                        {item.warehouse_selections && item.warehouse_selections.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.warehouse_selections.map((ws: WarehouseSelection) => (
                              <span key={ws.warehouse_id} className="mr-2">
                                {ws.warehouse_name}: {ws.deducted_quantity}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(item.unit_sale_price)}</TableCell>
                      <TableCell>{formatCurrency(item.total_line_price)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          disabled={isProcessingSale}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Cart is empty. Add items from the right.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Totals and Actions */}
          <div className="mt-6 border-t pt-10 pb-16 sticky bottom-0 bg-white z-10">
            <div className="flex justify-between items-center text-2xl font-bold mb-3">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-3xl font-extrabold mb-6">
              <span>Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            <div className="mb-6"></div>
            <Button
              className="w-full text-xl py-5 mb-3 font-semibold transition focus:ring-2 focus:ring-primary focus:outline-none"
              style={{ borderRadius: "0.75rem", fontSize: "1.5rem", height: "4rem" }}
              onClick={handlePayment}
              disabled={isProcessingSale || cart.length === 0}
              variant="default"
            >
              {isProcessingSale ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Process Payment"
              )}
            </Button>
            <Button
              className="w-full text-xl py-5 font-semibold transition focus:ring-2 focus:ring-primary focus:outline-none"
              style={{ borderRadius: "0.75rem", fontSize: "1.5rem", height: "4rem" }}
              variant="secondary"
              onClick={() => setIsExternalSaleDialogOpen(true)}
              disabled={isProcessingSale}
            >
              External Sale
            </Button>
          </div>
        </div>
        {/* Product Section */}
        <div className="md:w-3/5 p-4 flex flex-col h-screen overflow-hidden">
          {/* Search and Category Filter */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search products by name or reference..."
                className="pl-10 w-full"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
              />
            </div>
            <Select onValueChange={setActiveCategory} value={activeCategory || "all"}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {initialCategories.map((cat: CategoryForPos) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product: ProductForPos) => (
                  <ProductCardClient
                    key={product.id}
                    product={product}
                    productDetailedStock={productDetailedStock}
                    getStockStatusClass={(productId, threshold) => {
                      const totalStock = (productDetailedStock[productId] || []).reduce(
                        (sum: number, s: ProductStockDetail) => sum + s.quantity,
                        0
                      );
                      if (totalStock === 0) return "text-red-500";
                      if (totalStock <= threshold) return "text-yellow-500";
                      return "text-green-500";
                    }}
                    handleAddItemToCart={handleAddItemToCart}
                  />
                ))
              ) : (
                <p className="text-gray-500 col-span-full text-center">
                  No products found matching your criteria.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Add To Cart Dialog */}
      <AddToCartDialog
        open={addToCartOpen}
        onOpenChange={(open) => {
          setAddToCartOpen(open);
          if (!open) setSelectedProductForAddToCart(null);
        }}
        productName={selectedProductForAddToCart?.name || ""}
        productSalePrice={selectedProductForAddToCart?.sale_price || 0}
        warehouses={productDetailedStock[selectedProductForAddToCart?.id || '']?.map(sd => ({
          id: sd.warehouse_id,
          name: sd.warehouses?.name || 'Unknown',
          quantity: sd.quantity,
        })) || []}
        initialQty={initialQtyForAddToCart}
        initialNote={initialNoteForAddToCart}
        initialSalePrice={cart.find(item => item.id === selectedProductForAddToCart?.id)?.unit_sale_price}
        currentUserRole={currentUserRole}
        onSubmit={handleAddToCartSubmit}
      />

      {/* Payment Dialog - corrected props (isOpen, onOpenChange, onSubmit, isProcessing, grandTotal, formatCurrency, form) */}
      <PosInterfaceClientPaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onSubmit={onPaymentFormSubmit}
        isProcessing={isProcessingSale}
        grandTotal={grandTotal}
        formatCurrency={formatCurrency}
        form={paymentForm}
      />

      {/* External Sale Dialog */}
      <ExternalSaleDialog
        open={isExternalSaleDialogOpen}
        onOpenChange={setIsExternalSaleDialogOpen}
        categories={initialCategories}
        onSubmit={handleExternalSaleSubmit}
        isProcessing={isProcessingSale}
      />

      {/* Recent Sales Modal */}
      <RecentSalesModalClient
        initialRecentSales={initialRecentSales}
        isOpen={isRecentSalesModalOpen}
        onClose={() => setIsRecentSalesModalOpen(false)}
        currentCashierId={currentCashierId}
        currentUserRole={currentUserRole}
      />

      {/* Tiles Calculator Dialog */}
      <TilesCalculatorDialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />

      {/* Expenses Review Modal */}
      <ExpensesReviewModalClient
        initialExpenses={initialExpensesForReview}
        initialExpenseCategories={initialExpenseCategoriesForReview}
        currentCashierId={currentCashierId}
        currentUserRole={currentUserRole}
        branches={branches}
        currentUserBranchId={currentUserBranchId}
        isOpen={isExpensesReviewModalOpen}
        onClose={() => setIsExpensesReviewModalOpen(false)}
      />
    </div>
  );
}   
   