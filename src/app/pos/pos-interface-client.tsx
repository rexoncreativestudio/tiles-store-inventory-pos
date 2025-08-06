"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  XCircle,
  Search,
  Loader2,
  Calculator,
  RefreshCw,
  LogOut,
  History,
  Receipt,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabase/client";
import {
  CategoryForPos,
  ProductForPos,
  ProductStockDetail,
  CartItem,
  ExternalSaleFormValues,
  SaleRecordForRecentSales,
  ExpenseCategoryForPos,
  ExpenseRecordForPos,
  BranchForFilter,
} from "./types";
import RecentSalesModalClient from "./components/recent-sales-modal-client";
import ProductCardClient from "./product-card-client";
import TilesCalculatorDialog from "./components/tiles-calculator-dialog";
import ExternalSaleDialog from "./components/external-sale-dialog";
import ExpensesReviewModalClient from "./components/expenses-review-modal-client";
import AddToCartDialog from "./components/add-to-cart-dialog";
import PosInterfaceClientPaymentDialog from "./components/pos-interface-client-payment-dialog";
import Image from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";

// --- Payment Form Values ---
type PaymentFormValues = {
  amountReceived: number;
  customerName?: string;
  customerPhone?: string;
  status: "completed" | "held";
};

// --- Main Props Interface ---
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

  // --- Cart State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>("all");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productDetailedStock, setProductDetailedStock] = useState<Record<string, ProductStockDetail[]>>({});
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Add to Cart Dialog
  const [addToCartOpen, setAddToCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductForPos | null>(null);

  // External Sale Dialog
  const [isExternalSaleDialogOpen, setIsExternalSaleDialogOpen] = useState(false);

  // Calculator & Recent Sales
  const [isRecentSalesModalOpen, setIsRecentSalesModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Expenses Modal
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);

  // --- Payment Dialog State ---
  const paymentForm = useForm<PaymentFormValues>({
    defaultValues: { amountReceived: 0, customerName: "", customerPhone: "", status: "completed" },
  });

  // --- Warehouse Options ---
  const warehouseOptions =
    selectedProduct && productDetailedStock[selectedProduct.id]
      ? productDetailedStock[selectedProduct.id].map((stock) => ({
          id: stock.warehouse_id,
          name: stock.warehouses?.name || "Unknown",
          quantity: stock.quantity,
        }))
      : [];

  useEffect(() => {
    const stockMap: Record<string, ProductStockDetail[]> = {};
    initialDetailedStock.forEach((s: ProductStockDetail) => {
      if (!stockMap[s.product_id]) stockMap[s.product_id] = [];
      stockMap[s.product_id].push(s);
    });
    setProductDetailedStock(stockMap);
  }, [initialDetailedStock]);

  // --- Selectors and Derived Values ---
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

  // --- Add to Cart Dialog Logic ---
  const handleAddToCartClick = (product: ProductForPos) => {
    setSelectedProduct(product);
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
    selectedWarehouses: { id: string; name: string; deducted: number }[];
    note: string;
  }) => {
    if (!selectedProduct) return;

    const warehouseSelections = selectedWarehouses.map(w => ({
      warehouse_id: w.id,
      warehouse_name: w.name,
      deducted_quantity: w.deducted,
    }));

    const newItem: CartItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      unique_reference: selectedProduct.unique_reference,
      quantity: qty,
      unit_sale_price: salePrice,
      total_line_price: qty * salePrice,
      note,
      image_url: selectedProduct.image_url,
      warehouse_selections: warehouseSelections,
    };

    setCart((prevCart) => {
      const filtered = prevCart.filter(item => item.id !== newItem.id);
      return [...filtered, newItem];
    });

    setAddToCartOpen(false);
    setSelectedProduct(null);
    toast.success(`${selectedProduct.name} added/updated in cart.`);
  };

  const handleRemoveItem = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
    toast.info("Item removed from cart.");
  };

  // --- Payment Logic ---
  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Add items before proceeding to payment.");
      return;
    }
    setIsPaymentDialogOpen(true);
    paymentForm.reset({ amountReceived: grandTotal, customerName: "", customerPhone: "", status: "completed" });
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

    const saleItemsPayload = cart.map((item: CartItem) => ({
      product_id: item.id,
      quantity: Number(item.quantity || 0),
      unit_sale_price: Number(item.unit_sale_price || 0),
      total_price: Number(item.quantity * item.unit_sale_price),
      note: item.note,
      warehouse_selections: item.warehouse_selections,
    }));

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

    const { data: rpcResponseData, error: funcError } = await supabaseClient
      .rpc("process_sale_transaction", {
        sale_data: {
          sale_date: new Date().toISOString(),
          cashier_id: currentCashierId,
          branch_id: cashierBranchId,
          customer_name: values.customerName || "Walk-in Customer",
          customer_phone: values.customerPhone || null,
          total_amount: grandTotal,
          payment_method: "Cash",
          status: values.status,
          items: saleItemsPayload,
        },
      })
      .returns<{ transaction_reference: string; message: string }>();

    if (funcError) {
      toast.error("Failed to record sale.", { description: funcError.message });
      setIsProcessingSale(false);
      return;
    }

    if (
      rpcResponseData &&
      typeof rpcResponseData === "object" &&
      "transaction_reference" in rpcResponseData
    ) {
      const transactionRef = (rpcResponseData as { transaction_reference: string }).transaction_reference;
      toast.success(`Sale completed! Ref: ${transactionRef}`);
      setIsPaymentDialogOpen(false);
      setCart([]);
      router.push(`/receipt/${transactionRef}`);
      router.refresh();
      setIsProcessingSale(false);
      return;
    }

    toast.error("Sale recorded, but failed to receive transaction reference.");
    setIsProcessingSale(false);
  };

  // --- External Sale Logic ---
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
          status: values.status,
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

    if (
      externalRpcResponseData &&
      typeof externalRpcResponseData === "object" &&
      "external_transaction_reference" in externalRpcResponseData
    ) {
      const externalTransactionRef = (
        externalRpcResponseData as { external_transaction_reference: string }
      ).external_transaction_reference;
      toast.success(`External Sale completed! Ref: ${externalTransactionRef}`);
      setIsExternalSaleDialogOpen(false);
      setCart([]);
      router.push(`/receipt/external/${externalTransactionRef}`);
      router.refresh();
      setIsProcessingSale(false);
      return;
    }

    toast.error("External sale recorded, but failed to get transaction reference.");
    setIsProcessingSale(false);
  };

  // --- Logout Handler (redirect to app root)
  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  // --- Manual Refresh Handler (full page reload)
  const handleManualRefresh = () => {
    window.location.reload();
    toast.success("Page refreshed!");
  };

  // --- Date/Time State ---
  const [currentDateTime, setCurrentDateTime] = useState(() =>
    new Date().toLocaleString("en-GB", { hour12: false })
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date().toLocaleString("en-GB", { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Branch Name ---
  const currentBranch =
    branches.find((b) => b.id === currentUserBranchId)?.name || "Unknown Branch";

  // --- Render ---
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="w-full bg-white border-b shadow-sm p-8 min-h-[96px] flex items-center justify-between space-x-2 relative">
        {/* Left: Buttons group */}
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => setIsRecentSalesModalOpen(true)}
            title="Recent Sales"
            className="flex gap-2 items-center"
          >
            <History className="mr-1 h-5 w-5" />
            Recent Sales
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsExpensesModalOpen(true)}
            title="Expenses Review"
            className="flex gap-2 items-center"
          >
            <Receipt className="mr-1 h-5 w-5" />
            Expenses
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCalculatorOpen(true)}
            title="Tiles Pricing Calculator"
            className="flex gap-2 items-center"
          >
            <Calculator className="mr-1 h-5 w-5" />
            Calculator
          </Button>
          {/* Date/Time */}
          <span className="ml-4 font-mono text-gray-700 text-sm">{currentDateTime}</span>
        </div>
        {/* Center: Logo ONLY */}
        <div className="absolute left-1/2 top-1/2 flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
          <Image
            src="/megacompany.svg"
            alt="Business Logo"
            width={150}
            height={20}
            className=""
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        {/* Right: Branch Name, Refresh & Logout */}
        <div className="flex gap-2 items-center ml-auto">
          {/* Branch Name */}
          <div className="px-3 py-1 rounded bg-gray-100 text-gray-700 font-semibold text-sm">
            {currentBranch}
          </div>
          {/* Refresh Button: icon only */}
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            title="Refresh Page"
            className="flex gap-2 items-center"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            title="Logout"
            className="flex gap-2 items-center"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </header>
      {/* Main content: Cart, Products, and Dialogs */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Cart Section */}
        <div className="md:w-[48%] lg:w-1/2 p-8 flex flex-col bg-white border-r shadow-md h-full min-h-0">
          <h2 className="text-3xl font-bold mb-6">Cart</h2>
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
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getUnitForProduct(item.id)}</TableCell>
                      <TableCell>
                        {item.quantity}
                        {item.warehouse_selections && item.warehouse_selections.length > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.warehouse_selections.map(ws => (
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
              style={{
                borderRadius: "0.75rem",
                fontSize: "1.5rem",
                height: "4rem"
              }}
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
              style={{
                borderRadius: "0.75rem",
                fontSize: "1.5rem",
                height: "4rem"
              }}
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
                {initialCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 170px)' }}>
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
                    handleAddItemToCart={handleAddToCartClick}
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
          if (!open) setSelectedProduct(null);
        }}
        productName={selectedProduct?.name || ""}
        salePrice={selectedProduct?.sale_price ?? 0}
        userRole={currentUserRole}
        warehouses={warehouseOptions}
        initialQty={1}
        onSubmit={handleAddToCartSubmit}
      />
      {/* Payment Dialog */}
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
      {/* Calculator Dialog */}
      <TilesCalculatorDialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />
      {/* Recent Sales */}
      <RecentSalesModalClient
        initialRecentSales={initialRecentSales}
        isOpen={isRecentSalesModalOpen}
        onClose={() => setIsRecentSalesModalOpen(false)}
        currentCashierId={currentCashierId}
        currentUserRole={currentUserRole}
      />
      {/* Expenses Review Modal */}
      <ExpensesReviewModalClient
        initialExpenses={initialExpensesForReview}
        initialExpenseCategories={initialExpenseCategoriesForReview}
        currentCashierId={currentCashierId}
        isOpen={isExpensesModalOpen}
        onClose={() => setIsExpensesModalOpen(false)}
        branches={branches}
        currentUserBranchId={currentUserBranchId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
} 