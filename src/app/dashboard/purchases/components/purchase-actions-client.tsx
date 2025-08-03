"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PlusCircle, XCircle } from "lucide-react";
import { useForm, SubmitHandler, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabaseClient } from "@/lib/supabase/client";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProductForPurchaseItem = {
  id: string;
  name: string;
  unique_reference: string;
  product_unit_abbreviation: string | null;
  purchase_price?: number;
};

type WarehouseForFilter = {
  id: string;
  name: string;
};

const purchaseItemFormSchema = z.object({
  tempId: z.string(),
  product_id: z.string().uuid({ message: "Product is required." }),
  quantity: z.number().min(1, { message: "Quantity must be at least 1." }),
  unit_purchase_price: z.number().min(0, { message: "Purchase Price must be non-negative." }),
  note: z.string().nullable(),
});

// UPDATED: Use regex for warehouse_id instead of .uuid()
const purchaseFormSchema = z.object({
  purchase_date: z.string().min(1, { message: "Purchase date is required." }),
  warehouse_id: z.string().regex(
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    { message: "Warehouse is required." }
  ),
  status: z.string().min(1, { message: "Status is required." }),
  items: z.array(purchaseItemFormSchema).min(1, { message: "At least one item is required." }),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

type PurchaseRecordForEdit = {
  id: string;
  purchase_date: string;
  warehouse_id: string | null;
  status: string;
  total_cost: number;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_purchase_price: number;
    note: string | null;
  }[];
};

interface PurchaseManagementActionsProps {
  purchaseToEdit?: PurchaseRecordForEdit;
  products?: ProductForPurchaseItem[];
  warehouses?: WarehouseForFilter[];
  currentUserId: string;
  onPurchaseSubmitted: () => void;
}

function getCurrentDateTimeLocal() {
  const now = new Date();
  const pad = (v: number) => v.toString().padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function isoToDatetimeLocal(dateStr: string) {
  if (!dateStr) return getCurrentDateTimeLocal();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return getCurrentDateTimeLocal();
  const pad = (v: number) => v.toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function getDefaultFormValues(purchaseToEdit?: PurchaseRecordForEdit): PurchaseFormValues {
  if (purchaseToEdit) {
    return {
      purchase_date: isoToDatetimeLocal(purchaseToEdit.purchase_date),
      warehouse_id: purchaseToEdit.warehouse_id ?? "",
      status: purchaseToEdit.status || "completed",
      items: (purchaseToEdit.items ?? []).map((item) => ({
        tempId: item.id ?? crypto.randomUUID(),
        product_id: item.product_id,
        quantity: item.quantity,
        unit_purchase_price: item.unit_purchase_price,
        note: item.note,
      })),
    };
  }
  return {
    purchase_date: getCurrentDateTimeLocal(),
    warehouse_id: "",
    status: "completed",
    items: [
      {
        tempId: crypto.randomUUID(),
        product_id: "",
        quantity: 0,
        unit_purchase_price: 0,
        note: null,
      },
    ],
  };
}

export default function PurchaseManagementActions({
  purchaseToEdit,
  products = [],
  warehouses = [],
  currentUserId,
  onPurchaseSubmitted,
}: PurchaseManagementActionsProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: getDefaultFormValues(purchaseToEdit),
    mode: "onChange",
  });

  // ======= DEBUG LOGS =======
  const watchedWarehouseId = form.watch("warehouse_id");
  useEffect(() => {
    const id = watchedWarehouseId;
    // Show any extra spaces
    console.log(
      "Selected warehouse_id:",
      `"${id}"`,
      "Length:",
      id.length,
      "Trimmed length:",
      id.trim().length,
      "Is trimmed equal to original:",
      id.trim() === id,
      "Has leading/trailing spaces:",
      id !== id.trim()
    );
  }, [watchedWarehouseId]);
  // Log the warehouse data at mount
  useEffect(() => {
    console.log("Warehouses array:", warehouses);
  }, [warehouses]);
  // ==========================

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (purchaseToEdit) {
      form.reset(getDefaultFormValues(purchaseToEdit));
      setIsDialogOpen(true);
    }
  }, [purchaseToEdit, form]);

  const handleOpenAdd = () => {
    form.reset(getDefaultFormValues(undefined));
    setIsDialogOpen(true);
  };

  const watchedItems = form.watch("items");
  const overallTotalCost = (watchedItems ?? []).reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_purchase_price || 0);
    return sum + qty * price;
  }, 0);

  const handleProductSelect = (productId: string, index: number) => {
    form.setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
    const selectedProduct = products.find((p) => p.id === productId);
    if (selectedProduct?.purchase_price !== undefined) {
      form.setValue(`items.${index}.unit_purchase_price`, Number(selectedProduct.purchase_price));
    }
  };

  const onSubmit: SubmitHandler<PurchaseFormValues> = async (values) => {
    setIsLoading(true);
    let error: Error | null = null;

    const purchaseItemsPayload = values.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_purchase_price: item.unit_purchase_price,
      total_cost: item.quantity * item.unit_purchase_price,
      note: item.note,
    }));

    let purchaseDateValue = values.purchase_date;
    if (purchaseDateValue && !purchaseDateValue.endsWith("Z")) {
      purchaseDateValue = new Date(purchaseDateValue).toISOString();
    }

    if (purchaseToEdit) {
      // Update logic (if you want to also update stock for edit, you can implement similar adjustments here)
      const { error: dbError } = await supabaseClient
        .from("purchases")
        .update({
          purchase_date: purchaseDateValue,
          warehouse_id: values.warehouse_id,
          total_cost: overallTotalCost,
          status: values.status,
        })
        .eq("id", purchaseToEdit.id);
      error = dbError;

      if (!error) {
        await supabaseClient
          .from("purchase_items")
          .delete()
          .eq("purchase_id", purchaseToEdit.id);

        const { error: insertItemsError } = await supabaseClient
          .from("purchase_items")
          .insert(
            purchaseItemsPayload.map((item) => ({
              ...item,
              purchase_id: purchaseToEdit.id,
            }))
          );
        error = insertItemsError;

        // TODO: You may want to handle stock adjustment for edits (reverse previous and apply new).
        // For now, we'll only handle new purchase stock updates below.
      }
    } else {
      // --- NEW PURCHASE: record purchase, then purchase_items, then adjust stock ---
      const { data, error: dbError } = await supabaseClient
        .from("purchases")
        .insert({
          purchase_date: purchaseDateValue,
          warehouse_id: values.warehouse_id,
          total_cost: overallTotalCost,
          registered_by_user_id: currentUserId,
          status: values.status,
        })
        .select("id")
        .single();
      error = dbError;

      let purchaseId: string | null = null;
      if (!error && data?.id) {
        purchaseId = data.id;

        const { error: itemsError } = await supabaseClient
          .from("purchase_items")
          .insert(
            purchaseItemsPayload.map((item) => ({
              ...item,
              purchase_id: purchaseId,
            }))
          );
        error = itemsError;

        // --- ADJUST STOCK for each item ---
        if (!error) {
          const stockAdjustmentPromises = values.items.map(async (item) => {
            const { error: adjustError } = await supabaseClient.rpc('adjust_stock_quantity', {
              p_product_id: item.product_id,
              p_warehouse_id: values.warehouse_id,
              p_quantity_change: item.quantity,
              p_user_id: currentUserId,
              p_reason: `Purchase ${purchaseId || values.purchase_date} - Item: ${item.product_id}`
            });
            if (adjustError) {
              console.error(`Error adjusting stock for product ${item.product_id}:`, adjustError.message);
              // Log and proceed for now.
            }
          });
          await Promise.all(stockAdjustmentPromises);
        }
      }
    }

    if (error) {
      toast.error(
        `Failed to ${purchaseToEdit ? "update" : "add"} purchase.`,
        { description: error.message }
      );
    } else {
      toast.success(
        `Purchase ${purchaseToEdit ? "updated" : "added"} successfully!`
      );
      setIsDialogOpen(false);
      onPurchaseSubmitted();
      router.push("/dashboard/purchases");
    }
    setIsLoading(false);
  };

  const isNewPurchase = !purchaseToEdit;

  return (
    <>
      {isNewPurchase && (
        <Button onClick={handleOpenAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Purchase
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewPurchase
                ? "Add New Purchase"
                : `Edit Purchase: ${purchaseToEdit?.id || ""}`}
            </DialogTitle>
            <DialogDescription>
              {isNewPurchase
                ? "Enter details for the new stock purchase and add items."
                : "Make changes to the purchase record."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="purchase_date" className="font-semibold">
                  Purchase Date
                </label>
                <Input
                  id="purchase_date"
                  type="datetime-local"
                  {...form.register("purchase_date")}
                  disabled={isLoading}
                  value={form.watch("purchase_date")}
                  onChange={e => form.setValue("purchase_date", e.target.value)}
                />
                {form.formState.errors.purchase_date && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.purchase_date.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="warehouse_id" className="font-semibold">
                  Warehouse
                </label>
                <Controller
                  control={form.control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={val => field.onChange(val)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.warehouse_id && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.warehouse_id.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="status" className="font-semibold">
                  Status
                </label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "completed"}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.status && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.status.message}
                  </p>
                )}
              </div>
            </div>
            <h4 className="text-lg font-semibold mt-4">Purchase Items</h4>
            <div className="space-y-4">
              {itemFields.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end border p-4 rounded-md bg-gray-50"
                >
                  {/* Product Select with search and scrollable dropdown, fixed width for text overflow */}
                  <div className="col-span-full md:col-span-2 flex flex-col gap-2 min-w-0">
                    <label htmlFor={`items.${index}.product_id`} className="font-medium">
                      Product
                    </label>
                    <Controller
                      control={form.control}
                      name={`items.${index}.product_id`}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="justify-between w-full text-left truncate"
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              <span className="block truncate">
                                {field.value
                                  ? (
                                    products.find((p) => p.id === field.value)?.name +
                                    " (" +
                                    products.find((p) => p.id === field.value)?.unique_reference +
                                    ")"
                                  )
                                  : "Select Product"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="p-0 w-[340px] max-h-[280px] overflow-y-auto"
                            side="bottom"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Search product..." />
                              <CommandEmpty>No products found.</CommandEmpty>
                              <CommandGroup>
                                {(products ?? []).map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.id}
                                    onSelect={() => handleProductSelect(product.id, index)}
                                    className="truncate"
                                  >
                                    <span className="truncate">
                                      {product.name} ({product.unique_reference})
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {form.formState.errors.items?.[index]?.product_id && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.items[index]?.product_id?.message}
                      </p>
                    )}
                  </div>
                  {/* Quantity Field */}
                  <div className="flex flex-col gap-2 min-w-0">
                    <label htmlFor={`items.${index}.quantity`} className="font-medium">
                      Qty
                    </label>
                    <Input
                      id={`items.${index}.quantity`}
                      type="number"
                      step="1"
                      placeholder="1"
                      {...form.register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                      disabled={isLoading}
                    />
                    {form.formState.errors.items?.[index]?.quantity && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>
                  {/* Purchase Price Field */}
                  <div className="flex flex-col gap-2 min-w-0">
                    <label htmlFor={`items.${index}.unit_purchase_price`} className="font-medium">
                      Purchase Price
                    </label>
                    <Input
                      id={`items.${index}.unit_purchase_price`}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register(`items.${index}.unit_purchase_price`, {
                        valueAsNumber: true,
                      })}
                      disabled={isLoading}
                    />
                    {form.formState.errors.items?.[index]?.unit_purchase_price && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.items[index]?.unit_purchase_price?.message}
                      </p>
                    )}
                  </div>
                  {/* Line Total */}
                  <div className="flex flex-col items-end min-w-0">
                    <label className="font-medium">Line Total</label>
                    <p className="font-medium whitespace-nowrap">
                      {formatCurrency(
                        (watchedItems?.[index]?.quantity || 0) *
                          (watchedItems?.[index]?.unit_purchase_price || 0)
                      )}
                    </p>
                  </div>
                  {/* Remove Item */}
                  {itemFields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={isLoading}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendItem({
                    tempId: crypto.randomUUID(),
                    product_id: "",
                    quantity: 0,
                    unit_purchase_price: 0,
                    note: null,
                  })
                }
                disabled={isLoading}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="flex justify-between items-center text-xl font-bold mt-4">
              <span>Overall Total Cost:</span>
              <span>{formatCurrency(overallTotalCost)}</span>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isNewPurchase
                    ? "Adding Purchase..."
                    : "Saving Changes..."
                  : isNewPurchase
                  ? "Add Purchase"
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}