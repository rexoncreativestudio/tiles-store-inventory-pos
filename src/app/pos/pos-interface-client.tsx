"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { XCircle, Search, Loader2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
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
  ExternalSaleItemValues,
  ManagerAuthValues,
  externalSaleFormSchema,
  managerAuthSchema,
  ExternalSaleFormValues,
} from "./types";

type ItemToCartValues = {
  productId: string;
  quantity: number;
  unitPrice: number;
  note?: string;
};

type PaymentFormValues = {
  amountReceived: number;
  customerName?: string;
  customerPhone?: string;
};

interface PosInterfaceClientProps {
  initialProducts: ProductForPos[];
  initialCategories: CategoryForPos[];
  currentCashierId: string;
  initialDetailedStock: ProductStockDetail[];
}

export default function PosInterfaceClient({
  initialProducts,
  initialCategories,
  currentCashierId,
  initialDetailedStock,
}: PosInterfaceClientProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productDetailedStock, setProductDetailedStock] = useState<Record<string, ProductStockDetail[]>>({});
  const [isItemEditDialogOpen, setIsItemEditDialogOpen] = useState(false);
  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const [isExternalSaleDialogOpen, setIsExternalSaleDialogOpen] = useState(false);
  const [isManagerAuthDialogOpen, setIsManagerAuthDialogOpen] = useState(false);
  const [pendingExternalSaleData, setPendingExternalSaleData] = useState<ExternalSaleFormValues | null>(null);

  const [managerEmail, setManagerEmail] = useState<string>("");

  useEffect(() => {
    const fetchManagerEmail = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: userProfile, error } = await supabaseClient
          .from("users")
          .select("email, role")
          .eq("id", user.id)
          .single();

        if (!error && userProfile && ["admin", "general_manager", "branch_manager"].includes(userProfile.role)) {
          setManagerEmail(userProfile.email);
        }
      }
    };
    fetchManagerEmail();
  }, []);

  const itemForm = useForm<ItemToCartValues>({
    defaultValues: { productId: "", quantity: 1, unitPrice: 0, note: "" },
  });

  const paymentForm = useForm<PaymentFormValues>({
    defaultValues: { amountReceived: 0, customerName: "", customerPhone: "" },
  });

  const externalSaleForm = useForm<ExternalSaleFormValues>({
    resolver: zodResolver(externalSaleFormSchema),
    defaultValues: {
      customerName: "Walk-in Customer",
      customerPhone: "",
      items: [],
    },
  });

  const { fields: externalItemsFields, append: appendExternalItem, remove: removeExternalItem } = useFieldArray({
    control: externalSaleForm.control,
    name: "items",
  });

  const managerAuthForm = useForm<ManagerAuthValues>({
    resolver: zodResolver(managerAuthSchema),
    defaultValues: { managerEmail: managerEmail, authorizationCode: "", authorizedItems: [] },
  });

  const subtotal = useMemo(
    () => cart.reduce((sum: number, item: CartItem) => sum + item.total_line_price, 0),
    [cart]
  );
  const grandTotal = subtotal;

  // Watch items for correct external bill total calculation
  const watchedExternalItems = externalSaleForm.watch("items");
  // Remove unused variable warning by using the value below
  const externalSaleTotal = useMemo(() => {
    return watchedExternalItems?.reduce(
      (sum, item) =>
        sum +
        (typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || 0) *
        (typeof item.unit_sale_price === "number" ? item.unit_sale_price : Number(item.unit_sale_price) || 0),
      0
    ) || 0;
  }, [watchedExternalItems]);

  useEffect(() => {
    const stockMap: Record<string, ProductStockDetail[]> = {};
    initialDetailedStock.forEach((s: ProductStockDetail) => {
      if (!stockMap[s.product_id]) {
        stockMap[s.product_id] = [];
      }
      stockMap[s.product_id].push(s);
    });
    setProductDetailedStock(stockMap);
  }, [initialDetailedStock]);

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

  const handleAddItemToCart = (product: ProductForPos) => {
    const totalAvailableStock = (productDetailedStock[product.id] || []).reduce(
      (sum: number, s: ProductStockDetail) => sum + s.quantity,
      0
    );
    if (totalAvailableStock === 0) {
      toast.error("Product is out of stock in all warehouses.");
      return;
    }

    const existingCartItemIndex = cart.findIndex((item) => item.id === product.id);
    if (existingCartItemIndex !== -1) {
      setEditingCartItemIndex(existingCartItemIndex);
      const existingItem = cart[existingCartItemIndex];
      itemForm.reset({
        productId: existingItem.id,
        quantity: existingItem.quantity,
        unitPrice: existingItem.unit_sale_price,
        note: existingItem.note,
      });
    } else {
      setEditingCartItemIndex(null);
      itemForm.reset({
        productId: product.id,
        quantity: 1,
        unitPrice: product.sale_price,
        note: "",
      });
    }
    setIsItemEditDialogOpen(true);
  };

  const onItemFormSubmit: SubmitHandler<ItemToCartValues> = (values) => {
    const product = initialProducts.find((p) => p.id === values.productId);
    if (!product) {
      toast.error("Selected product not found.");
      return;
    }

    const totalAvailableStock = (productDetailedStock[product.id] || []).reduce(
      (sum: number, s: ProductStockDetail) => sum + s.quantity,
      0
    );
    if (values.quantity > totalAvailableStock) {
      toast.error(
        `Insufficient stock. Only ${totalAvailableStock} available for ${product.name} across all warehouses.`
      );
      return;
    }

    const newItem: CartItem = {
      id: product.id,
      name: product.name,
      unique_reference: product.unique_reference,
      quantity: values.quantity,
      unit_sale_price: values.unitPrice,
      total_line_price: values.quantity * values.unitPrice,
      note: values.note,
      image_url: product.image_url,
    };

    setCart((prevCart) => {
      if (editingCartItemIndex !== null) {
        const updatedCart = [...prevCart];
        updatedCart[editingCartItemIndex] = newItem;
        return updatedCart;
      } else {
        return [...prevCart, newItem];
      }
    });

    setIsItemEditDialogOpen(false);
    setEditingCartItemIndex(null);
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
    paymentForm.reset({ amountReceived: grandTotal, customerName: "", customerPhone: "" });
  };

  const onPaymentFormSubmit: SubmitHandler<PaymentFormValues> = async (values) => {
    setIsProcessingSale(true);
    let error: Error | null = null;

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
    }));

    const { data: cashierProfile, error: cashierProfileError } =
      await supabaseClient
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
          status: "completed",
          items: saleItemsPayload,
        },
      })
      .returns<{ transaction_reference: string; message: string }[]>();

    if (funcError) {
      error = funcError;
      toast.error("Failed to record sale.", { description: funcError.message });
    }

    if (error) {
      toast.error("Failed to record sale.", {
        description: (error as unknown as Error)?.message || "Unknown error",
      });
    } else {
      const transactionRef =
        Array.isArray(rpcResponseData) && rpcResponseData.length > 0
          ? rpcResponseData[0].transaction_reference
          : undefined;

      if (!transactionRef) {
        toast.error("Sale completed, but failed to get transaction reference.");
        setIsProcessingSale(false);
        return;
      }
      toast.success(`Sale completed! Ref: ${transactionRef}`);
      setIsPaymentDialogOpen(false);
      setCart([]);
      router.push(`/receipt/${transactionRef}`);
      router.refresh();
    }
    setIsProcessingSale(false);
  };

  // CONTINUED IN NEXT SUBMISSION
    // CONTINUED

  const handleConfirmExternalBill: SubmitHandler<ExternalSaleFormValues> = async (values) => {
    setPendingExternalSaleData(values);
    setIsExternalSaleDialogOpen(false);
    setIsManagerAuthDialogOpen(true);
    managerAuthForm.reset({
      managerEmail: managerEmail,
      authorizationCode: "",
      authorizedItems: values.items.map((item: ExternalSaleItemValues) => ({
        tempId: item.tempId,
        unit_purchase_price_negotiated: 0,
      })),
    });
  };

  // Remove unused 'err' warning by not defining it if not used
  const onManagerAuthSubmit: SubmitHandler<ManagerAuthValues> = async (managerValues) => {
    if (!pendingExternalSaleData) {
      toast.error("No external sale data pending approval.");
      return;
    }

    setIsProcessingSale(true);
    let authError: Error | null = null;
    let funcError: Error | null = null;

    const { data: managerAuthResult, error: managerSignInError } =
      await supabaseClient.auth.signInWithPassword({
        email: managerValues.managerEmail,
        password: managerValues.authorizationCode,
      });

    if (managerSignInError || !managerAuthResult.user) {
      authError = managerSignInError;
      toast.error("Manager authentication failed. Invalid email or code.", {
        description: (authError as unknown as Error)?.message || "Unknown error",
      });
      setIsProcessingSale(false);
      return;
    }

    const managerUserId = managerAuthResult.user.id;
    const { data: managerProfile, error: managerProfileError } = await supabaseClient
      .from("users")
      .select("role, branch_id, authorization_code_hashed")
      .eq("id", managerUserId)
      .single();

    if (
      managerProfileError ||
      !managerProfile ||
      !["admin", "general_manager", "branch_manager"].includes(managerProfile.role)
    ) {
      toast.error("User is not authorized to approve sales.");
      setIsProcessingSale(false);
      return;
    }

    const saleItemsPayload = pendingExternalSaleData.items.map((item: ExternalSaleItemValues) => {
      const managerItem = managerValues.authorizedItems.find((mItem) => mItem.tempId === item.tempId);
      const category = initialCategories.find((cat) => cat.id === item.product_category_id);

      return {
        product_name: item.product_name,
        product_category_name: category?.name || null,
        product_unit_name: item.product_unit_name,
        quantity: Number(item.quantity || 0),
        unit_sale_price: Number(item.unit_sale_price || 0),
        unit_purchase_price_negotiated: Number(managerItem?.unit_purchase_price_negotiated || 0),
        total_cost: Number(item.quantity || 0) * Number(managerItem?.unit_purchase_price_negotiated || 0),
        total_price: Number(item.quantity || 0) * Number(item.unit_sale_price || 0),
        note: item.note,
      };
    });

    const totalExternalSaleAmount = saleItemsPayload.reduce(
      (sum: number, item) => sum + item.total_price,
      0
    );

    const { data: externalRpcResponseData, error: externalFuncError } =
      await supabaseClient.rpc("process_external_sale_transaction", {
        external_sale_data: {
          sale_date: new Date().toISOString(),
          cashier_id: currentCashierId,
          branch_id: managerProfile.branch_id,
          customer_name: pendingExternalSaleData.customerName,
          customer_phone: pendingExternalSaleData.customerPhone || null,
          total_amount: totalExternalSaleAmount,
          payment_method: "Cash",
          status: "completed",
          authorized_by_user_id: managerUserId,
          authorization_code_hashed: managerProfile.authorization_code_hashed,
          items: saleItemsPayload,
        },
      }).returns<{ external_transaction_reference: string; message: string }[]>();

    if (externalFuncError) {
      funcError = externalFuncError;
      toast.error("Failed to record external sale.", {
        description: (externalFuncError as unknown as Error)?.message || "Unknown error",
      });
    }

    if (authError || funcError) {
      toast.error("External sale failed.", {
        description:
          (authError as unknown as Error)?.message ||
          (funcError as unknown as Error)?.message ||
          "Unknown error",
      });
    } else {
      const externalTransactionRef =
        Array.isArray(externalRpcResponseData) && externalRpcResponseData.length > 0
          ? externalRpcResponseData[0].external_transaction_reference
          : undefined;

      if (!externalTransactionRef) {
        toast.error("External sale recorded, but failed to get transaction reference.");
        setIsProcessingSale(false);
        return;
      }
      toast.success(`External Sale completed! Ref: ${externalTransactionRef}`);
      setIsExternalSaleDialogOpen(false);
      setIsManagerAuthDialogOpen(false);
      setCart([]);
      externalSaleForm.reset();
      setPendingExternalSaleData(null);
      router.push(`/receipt/external/${externalTransactionRef}`);
      router.refresh();
    }
    setIsProcessingSale(false);
  };

  const getStockStatusClass = (productId: string, threshold: number) => {
    const totalStock = (productDetailedStock[productId] || []).reduce(
      (sum: number, s: ProductStockDetail) => sum + s.quantity,
      0
    );
    if (totalStock === 0) return "text-red-500";
    if (totalStock <= threshold) return "text-yellow-500";
    return "text-green-500";
  };

  const selectedProductForModal = initialProducts.find(
    (product: ProductForPos) => product.id === itemForm.watch("productId")
  );

  // --- MAIN JSX ---
  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Cart Section */}
      <div className="md:w-2/5 p-4 flex flex-col bg-white border-r shadow-md">
        <h2 className="text-2xl font-bold mb-4">Cart</h2>
        <div className="flex-grow overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.length > 0 ? (
                cart.map((item: CartItem, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
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
                  <TableCell colSpan={5} className="h-24 text-center">
                    Cart is empty. Add items from the right.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between items-center text-xl font-bold mb-2">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-2xl font-extrabold mb-4">
            <span>Total:</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
          <Button
            className="w-full text-lg py-3"
            onClick={handlePayment}
            disabled={isProcessingSale || cart.length === 0}
          >
            {isProcessingSale ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              "Process Payment"
            )}
          </Button>
          <Button
            className="w-full text-lg py-3 mt-2"
            variant="secondary"
            onClick={() => setIsExternalSaleDialogOpen(true)}
            disabled={isProcessingSale}
          >
            External Sale
          </Button>
        </div>
      </div>

      {/* Product Section */}
      <div className="md:w-3/5 p-4 flex flex-col">
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

        <div className="flex-grow overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product: ProductForPos) => (
              <Card
                key={product.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg",
                  productDetailedStock[product.id]?.reduce((sum, s) => sum + s.quantity, 0) === 0
                    ? "opacity-50 grayscale"
                    : ""
                )}
                onClick={() =>
                  productDetailedStock[product.id]?.reduce((sum, s) => sum + s.quantity, 0) === 0
                    ? toast.error("Product is out of stock.")
                    : handleAddItemToCart(product)
                }
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <CardTitle className="text-base truncate w-full">{product.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    {product.unique_reference}
                  </CardDescription>
                  <p className="font-semibold text-lg mt-1">{formatCurrency(product.sale_price)}</p>
                  {productDetailedStock[product.id] && productDetailedStock[product.id].length > 0 ? (
                    <p
                      key={product.id}
                      className={cn(
                        "text-sm",
                        getStockStatusClass(product.id, product.low_stock_threshold)
                      )}
                    >
                      {productDetailedStock[product.id].map((stockDetail: ProductStockDetail) => (
                        <span key={stockDetail.warehouse_id}>
                          {stockDetail.warehouses?.name || "Unknown Warehouse"}: {stockDetail.quantity}{" "}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "text-sm",
                        getStockStatusClass(product.id, product.low_stock_threshold)
                      )}
                    >
                      No Stock Records
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-gray-500 col-span-full text-center">
              No products found matching your criteria.
            </p>
          )}
        </div>
      </div>
            {/* Item Edit Dialog */}
      <Dialog open={isItemEditDialogOpen} onOpenChange={setIsItemEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCartItemIndex !== null
                ? `Edit Item: ${cart[editingCartItemIndex]?.name}`
                : "Add Item to Cart"}
            </DialogTitle>
            <DialogDescription>
              Adjust quantity, unit price, or add a note.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={itemForm.handleSubmit(onItemFormSubmit)}
            className="grid gap-4 py-4"
          >
            <div>
              <Label>Product</Label>
              <Input value={selectedProductForModal?.name || ""} disabled />
            </div>
            <div>
              <Label htmlFor="item_quantity">Quantity</Label>
              <Input
                id="item_quantity"
                type="number"
                step="1"
                placeholder="1"
                {...itemForm.register("quantity", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="item_unitPrice">Unit Price</Label>
              <Input
                id="item_unitPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...itemForm.register("unitPrice", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="item_note">Note (Optional)</Label>
              <Input
                id="item_note"
                placeholder="e.g., chipped corner"
                {...itemForm.register("note")}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessingSale}>
                {isProcessingSale ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Update Cart Item"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Finalize the sale and calculate change.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={paymentForm.handleSubmit(onPaymentFormSubmit)}
            className="grid gap-4 py-4"
          >
            <div>
              <Label htmlFor="amountReceived">Amount Received</Label>
              <Input
                id="amountReceived"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...paymentForm.register("amountReceived", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name (Optional)</Label>
              <Input id="customerName" {...paymentForm.register("customerName")} />
            </div>
            <div>
              <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
              <Input id="customerPhone" {...paymentForm.register("customerPhone")} />
            </div>

            <div className="flex justify-between items-center text-lg font-semibold mt-4">
              <span>Change Due:</span>
              <span>
                {formatCurrency(paymentForm.watch("amountReceived") - grandTotal)}
              </span>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isProcessingSale}>
                {isProcessingSale ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Confirm Payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* External Sale Dialog */}
      <Dialog open={isExternalSaleDialogOpen} onOpenChange={setIsExternalSaleDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record External Sale</DialogTitle>
            <DialogDescription>
              Enter details for products not in current inventory.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={externalSaleForm.handleSubmit(handleConfirmExternalBill)}
            className="grid gap-4 py-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="external_customerName">Customer Name</Label>
                <Input id="external_customerName" {...externalSaleForm.register("customerName")} />
                {externalSaleForm.formState.errors.customerName && (
                  <span className="text-red-500 text-xs">
                    {externalSaleForm.formState.errors.customerName.message}
                  </span>
                )}
              </div>
              <div>
                <Label htmlFor="external_customerPhone">Customer Phone (Optional)</Label>
                <Input id="external_customerPhone" {...externalSaleForm.register("customerPhone")} />
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-4">External Sale Items</h3>
            <div className="space-y-4">
              {externalItemsFields.map((item: ExternalSaleItemValues, index: number) => {
                const watchedItem = watchedExternalItems[index] || {};
                const qty =
                  typeof watchedItem.quantity === "number"
                    ? watchedItem.quantity
                    : Number(watchedItem.quantity) || 0;
                const salePrice =
                  typeof watchedItem.unit_sale_price === "number"
                    ? watchedItem.unit_sale_price
                    : Number(watchedItem.unit_sale_price) || 0;
                const itemTotalSale = qty * salePrice;

                return (
                  <div
                    key={item.tempId}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end border p-4 rounded-md"
                  >
                    <div className="col-span-full md:col-span-2">
                      <Label htmlFor={`items.${index}.product_name`}>Product Name / Reference</Label>
                      <Input
                        id={`items.${index}.product_name`}
                        {...externalSaleForm.register(`items.${index}.product_name`)}
                      />
                      {externalSaleForm.formState.errors.items?.[index]?.product_name && (
                        <span className="text-red-500 text-xs">
                          {externalSaleForm.formState.errors.items[index].product_name.message}
                        </span>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.product_category_id`}>Category</Label>
                      <Select
                        value={watchedItem.product_category_id ?? "__NULL_SELECTION__"}
                        onValueChange={(value) => {
                          externalSaleForm.setValue(
                            `items.${index}.product_category_id`,
                            value === "__NULL_SELECTION__" ? null : value,
                            { shouldValidate: true }
                          );
                          const selectedCategory = initialCategories.find(
                            (cat) => cat.id === value
                          );
                          externalSaleForm.setValue(
                            `items.${index}.product_unit_name`,
                            selectedCategory?.unit_abbreviation || null,
                            { shouldValidate: true }
                          );
                        }}
                      >
                        <SelectTrigger id={`items.${index}.product_category_id`}>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NULL_SELECTION__">None</SelectItem>
                          {initialCategories.map((cat: CategoryForPos) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {externalSaleForm.formState.errors.items?.[index]?.product_category_id && (
                        <span className="text-red-500 text-xs">
                          {externalSaleForm.formState.errors.items[index].product_category_id.message}
                        </span>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.product_unit_name`}>Unit</Label>
                      <Input
                        id={`items.${index}.product_unit_name`}
                        {...externalSaleForm.register(`items.${index}.product_unit_name`)}
                        disabled
                        placeholder="Unit auto-fills from category"
                      />
                      {externalSaleForm.formState.errors.items?.[index]?.product_unit_name && (
                        <span className="text-red-500 text-xs">
                          {externalSaleForm.formState.errors.items[index].product_unit_name.message}
                        </span>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.quantity`}>Qty</Label>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        step="1"
                        placeholder="1"
                        {...externalSaleForm.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {externalSaleForm.formState.errors.items?.[index]?.quantity && (
                        <span className="text-red-500 text-xs">
                          {externalSaleForm.formState.errors.items[index].quantity.message}
                        </span>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.unit_sale_price`}>Sale Price</Label>
                      <Input
                        id={`items.${index}.unit_sale_price`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...externalSaleForm.register(`items.${index}.unit_sale_price`, { valueAsNumber: true })}
                      />
                      {externalSaleForm.formState.errors.items?.[index]?.unit_sale_price && (
                        <span className="text-red-500 text-xs">
                          {externalSaleForm.formState.errors.items[index].unit_sale_price.message}
                        </span>
                      )}
                    </div>
                    <div className="col-span-full md:col-span-2">
                      <Label htmlFor={`items.${index}.note`}>Note (Optional)</Label>
                      <textarea
                        id={`items.${index}.note`}
                        {...externalSaleForm.register(`items.${index}.note`)}
                        className="w-full min-h-[48px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Add more details if needed"
                      />
                    </div>
                    <div className="col-span-full md:col-span-2 flex items-center justify-between">
                      <Label>Total Sale:</Label>
                      <p className="font-medium whitespace-nowrap">
                        {formatCurrency(itemTotalSale)}
                      </p>
                    </div>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeExternalItem(index)}
                        disabled={isProcessingSale}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendExternalItem({
                    tempId: crypto.randomUUID(),
                    product_name: "",
                    product_category_id: null,
                    product_unit_name: null,
                    quantity: 1,
                    unit_sale_price: 0,
                    note: "",
                  })
                }
                disabled={isProcessingSale}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add External Item
              </Button>
            </div>
            <div className="flex justify-between items-center text-xl font-bold mt-4">
              <span>External Bill Total:</span>
              <span>{formatCurrency(externalSaleTotal)}</span>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessingSale}>
                {isProcessingSale ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Confirm External Bill"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manager Authorization Dialog */}
      <Dialog open={isManagerAuthDialogOpen} onOpenChange={setIsManagerAuthDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manager Authorization</DialogTitle>
            <DialogDescription>
              Review items, enter negotiated purchase prices, and authorize the sale.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={managerAuthForm.handleSubmit(onManagerAuthSubmit)} className="grid gap-4 py-4">
            <h4 className="font-semibold">External Sale Summary:</h4>
            {pendingExternalSaleData?.items && pendingExternalSaleData.items.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border p-2 rounded">
                {pendingExternalSaleData.items.map((item: ExternalSaleItemValues, index: number) => {
                  const currentItemSaleTotal = (item.quantity || 0) * (item.unit_sale_price || 0);
                  const currentCategory = initialCategories.find(cat => cat.id === item.product_category_id);
                  const managerItemData = managerAuthForm.watch(`authorizedItems.${index}`);
                  const managerPurchasePrice = managerItemData?.unit_purchase_price_negotiated || 0;
                  const managerTotalCost = (item.quantity || 0) * managerPurchasePrice;
                  const itemProfit = currentItemSaleTotal - managerTotalCost;

                  return (
                    <div key={item.tempId} className="border-b pb-2 mb-2 last:border-b-0">
                      <p className="font-medium text-sm">
                        {item.product_name} ({item.quantity} {item.product_unit_name || "N/A"}) - {formatCurrency(currentItemSaleTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground ml-2">Category: {currentCategory?.name || "N/A"}</p>
                      {item.note && <p className="text-xs text-muted-foreground ml-2">Note: {item.note}</p>}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-2">
                        <Label htmlFor={`authorizedItems.${index}.unit_purchase_price_negotiated`}>
                          Purchase Price (Unit):
                        </Label>
                        <Input
                          id={`authorizedItems.${index}.unit_purchase_price_negotiated`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="flex-grow"
                          {...managerAuthForm.register(`authorizedItems.${index}.unit_purchase_price_negotiated`, { valueAsNumber: true })}
                          disabled={isProcessingSale}
                        />
                      </div>
                      <div className={cn("flex justify-between items-center text-sm font-semibold mt-1", itemProfit > 0 ? "text-green-600" : "text-red-600")}>
                        <span>Calculated Cost:</span>
                        <span>{formatCurrency(managerTotalCost)}</span>
                      </div>
                      <div className={cn("flex justify-between items-center text-sm font-bold mt-1", itemProfit > 0 ? "text-green-600" : "text-red-600")}>
                        <span>Item Profit:</span>
                        <span>{formatCurrency(itemProfit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No items in external sale.</p>
            )}
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <Label htmlFor="managerEmail">Manager Email</Label>
                <Input id="managerEmail" type="email" {...managerAuthForm.register("managerEmail")} disabled={isProcessingSale} />
              </div>
              <div>
                <Label htmlFor="authorizationCode">Authorization Code</Label>
                <Input id="authorizationCode" type="password" {...managerAuthForm.register("authorizationCode")} disabled={isProcessingSale} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessingSale}>
                {isProcessingSale ? <Loader2 className="animate-spin mr-2" /> : "Approve Sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
