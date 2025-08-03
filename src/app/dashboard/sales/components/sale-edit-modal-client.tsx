"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle, XCircle } from "lucide-react";
import {
  useForm,
  SubmitHandler,
  useFieldArray,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabaseClient } from "@/lib/supabase/client";
import { useCurrencyFormatter } from "@/lib/formatters";
import type {
  ProductForSaleItem,
  SaleRecordForEdit,
} from "../types/sales";

const saleItemFormSchema = z.object({
  tempId: z.string().uuid(),
  product_id: z.string().uuid({ message: "Product is required." }),
  quantity: z.number().min(1, { message: "Quantity must be at least 1." }),
  unit_sale_price: z.number().min(0, { message: "Unit Sale Price must be non-negative." }),
  note: z.string().nullable(),
});

const saleFormSchema = z.object({
  sale_date: z.string().min(1, { message: "Sale date is required." }),
  cashier_id: z.string().uuid({ message: "Cashier is required." }).nullable(),
  branch_id: z.string().uuid({ message: "Branch is required." }).nullable(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  payment_method: z.string().min(1, { message: "Payment method is required." }),
  status: z.enum(["completed", "held", "cancelled"]),
  items: z.array(saleItemFormSchema).min(1, { message: "At least one item is required." }),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

type UserForSelect = {
  id: string;
  email: string;
};

type BranchForSelect = {
  id: string;
  name: string;
};

interface SaleEditModalClientProps {
  saleToEdit?: SaleRecordForEdit;
  products: ProductForSaleItem[];
  cashiers: UserForSelect[];
  branches: BranchForSelect[];
  currentUserId: string;
  onSaleSubmitted: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function normalizeItemsForForm(items: SaleRecordForEdit["sale_items"]) {
  return items.map((item) => ({
    tempId: item.id ?? crypto.randomUUID(),
    product_id: item.product_id,
    quantity: item.quantity,
    unit_sale_price: item.unit_sale_price,
    note: item.note,
  }));
}

export default function SaleEditModalClient({
  saleToEdit,
  products = [],
  cashiers = [],
  branches = [],
  currentUserId,
  onSaleSubmitted,
  isOpen,
  onClose,
}: SaleEditModalClientProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: saleToEdit
      ? {
          sale_date: saleToEdit.sale_date.split("T")[0],
          cashier_id: saleToEdit.cashier_id,
          branch_id: saleToEdit.branch_id,
          customer_name: saleToEdit.customer_name || "",
          customer_phone: saleToEdit.customer_phone || "",
          payment_method: saleToEdit.payment_method,
          status: (saleToEdit.status === "completed" ||
            saleToEdit.status === "held" ||
            saleToEdit.status === "cancelled"
            ? saleToEdit.status
            : "completed") as SaleFormValues["status"],
          items: normalizeItemsForForm(saleToEdit.sale_items),
        }
      : {
          sale_date: new Date().toISOString().split("T")[0],
          cashier_id: currentUserId,
          branch_id: null,
          customer_name: "",
          customer_phone: "",
          payment_method: "Cash",
          status: "completed",
          items: [
            {
              tempId: crypto.randomUUID(),
              product_id: "",
              quantity: 0,
              unit_sale_price: 0,
              note: null,
            },
          ],
        },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const overallTotalAmount = useMemo(() => {
    return (watchedItems || []).reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unit_sale_price || 0);
      return sum + qty * price;
    }, 0);
  }, [watchedItems]);

  const onSubmit: SubmitHandler<SaleFormValues> = async (values) => {
    setIsLoading(true);
    let error: Error | null = null;

    const saleItemsPayload = values.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_sale_price: item.unit_sale_price,
      total_price: item.quantity * item.unit_sale_price,
      note: item.note,
    }));

    if (saleToEdit) {
      const { error: dbError } = await supabaseClient
        .from("sales")
        .update({
          sale_date: values.sale_date,
          cashier_id: values.cashier_id,
          branch_id: values.branch_id,
          customer_name: values.customer_name || null,
          customer_phone: values.customer_phone || null,
          total_amount: overallTotalAmount,
          payment_method: values.payment_method,
          status: values.status,
        })
        .eq("id", saleToEdit.id);
      error = dbError;

      if (!error) {
        await supabaseClient.from("sale_items").delete().eq("sale_id", saleToEdit.id);
        const { error: itemsError } = await supabaseClient
          .from("sale_items")
          .insert(
            saleItemsPayload.map((item) => ({
              ...item,
              sale_id: saleToEdit.id,
            }))
          );
        error = itemsError;
      }
    } else {
      const { data, error: dbError } = await supabaseClient
        .from("sales")
        .insert({
          sale_date: values.sale_date,
          cashier_id: values.cashier_id,
          branch_id: values.branch_id,
          customer_name: values.customer_name || null,
          customer_phone: values.customer_phone || null,
          total_amount: overallTotalAmount,
          payment_method: values.payment_method,
          status: values.status,
          transaction_reference: `POS-${new Date().getTime()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      error = dbError;
      const saleId = data?.id || null;

      if (!error && saleId) {
        const { error: itemsError } = await supabaseClient
          .from("sale_items")
          .insert(
            saleItemsPayload.map((item) => ({ ...item, sale_id: saleId }))
          );
        error = itemsError;
      }
    }

    if (error) {
      toast.error(
        `Failed to ${saleToEdit ? "update" : "add"} sale.`,
        { description: error.message }
      );
    } else {
      toast.success(
        `Sale ${saleToEdit ? "updated" : "added"} successfully!`
      );
      onClose();
      onSaleSubmitted();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      form.reset(
        saleToEdit
          ? {
              sale_date: saleToEdit.sale_date.split("T")[0],
              cashier_id: saleToEdit.cashier_id,
              branch_id: saleToEdit.branch_id,
              customer_name: saleToEdit.customer_name || "",
              customer_phone: saleToEdit.customer_phone || "",
              payment_method: saleToEdit.payment_method,
              status:
                saleToEdit.status === "completed" ||
                saleToEdit.status === "held" ||
                saleToEdit.status === "cancelled"
                  ? saleToEdit.status
                  : "completed",
              items: normalizeItemsForForm(saleToEdit.sale_items),
            }
          : {
              sale_date: new Date().toISOString().split("T")[0],
              cashier_id: currentUserId,
              branch_id: null,
              customer_name: "",
              customer_phone: "",
              payment_method: "Cash",
              status: "completed",
              items: [
                {
                  tempId: crypto.randomUUID(),
                  product_id: "",
                  quantity: 0,
                  unit_sale_price: 0,
                  note: null,
                },
              ],
            }
      );
      form.clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saleToEdit, currentUserId]);

  const isNewSale = !saleToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNewSale
              ? "Add New Sale"
              : `Edit Sale: ${saleToEdit?.transaction_reference || ""}`}
          </DialogTitle>
          <DialogDescription>
            {isNewSale
              ? "Enter details for a new sale transaction."
              : "Make changes to this sale record."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 py-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="sale_date" className="mb-2">Sale Date</Label>
              <Input
                id="sale_date"
                type="datetime-local"
                {...form.register("sale_date")}
                disabled={isLoading}
                value={form.watch("sale_date")}
                onChange={e => form.setValue("sale_date", e.target.value)}
              />
              {form.formState.errors.sale_date && <p className="text-red-500 text-sm mt-1">{form.formState.errors.sale_date.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cashier_id" className="mb-2">Cashier</Label>
              <Controller
                control={form.control}
                name="cashier_id"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={isLoading || !isNewSale}
                  >
                    <SelectTrigger id="cashier_id">
                      <SelectValue placeholder="Select a cashier" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashiers.map(cashier => (
                        <SelectItem key={cashier.id} value={cashier.id}>{cashier.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.cashier_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.cashier_id.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="branch_id" className="mb-2">Branch</Label>
              <Controller
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={isLoading || !isNewSale}
                  >
                    <SelectTrigger id="branch_id">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.branch_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.branch_id.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_method" className="mb-2">Payment Method</Label>
              <Select
                onValueChange={(value) => form.setValue("payment_method", value, { shouldValidate: true })}
                value={form.watch("payment_method")}
                disabled={isLoading}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.payment_method && <p className="text-red-500 text-sm mt-1">{form.formState.errors.payment_method.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="customer_name" className="mb-2">Customer Name (Optional)</Label>
              <Input id="customer_name" {...form.register("customer_name")} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer_phone" className="mb-2">Customer Phone (Optional)</Label>
              <Input id="customer_phone" {...form.register("customer_phone")} disabled={isLoading} />
            </div>
          </div>
          {!isNewSale && (
            <div className="grid gap-2">
              <Label htmlFor="status" className="mb-2">Sale Status</Label>
              <Select
                onValueChange={(value) => form.setValue("status", value as 'completed' | 'held' | 'cancelled', { shouldValidate: true })}
                value={form.watch("status")}
                disabled={isLoading}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>}
            </div>
          )}
          <h4 className="text-xl font-bold mt-6 mb-2">Sale Items</h4>
          <div className="flex flex-col gap-6">
            {itemFields.map((item, index) => {
              const lineTotal = (form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.unit_sale_price`) || 0);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 rounded-lg border bg-gray-50 items-center"
                  style={{ position: 'relative' }}
                >
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <Label htmlFor={`items.${index}.product_id`} className="mb-1">Product</Label>
                    <Select
                      onValueChange={(value) => {
                        form.setValue(`items.${index}.product_id`, value, { shouldValidate: true });
                        const selectedProduct = products.find(p => p.id === value);
                        if (selectedProduct?.sale_price !== undefined) {
                          form.setValue(`items.${index}.unit_sale_price`, Number(selectedProduct.sale_price));
                        }
                      }}
                      value={form.watch(`items.${index}.product_id`) || ''}
                      disabled={isLoading}
                    >
                      <SelectTrigger id={`items.${index}.product_id`}>
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(productOption => (
                          <SelectItem key={productOption.id} value={productOption.id}>
                            {productOption.name} ({productOption.unique_reference})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.items?.[index]?.product_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.product_id?.message}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`items.${index}.quantity`} className="mb-1">Quantity</Label>
                    <Input
                      id={`items.${index}.quantity`}
                      type="number"
                      step="1"
                      placeholder="1"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                    {form.formState.errors.items?.[index]?.quantity && <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.quantity?.message}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`items.${index}.unit_sale_price`} className="mb-1">Unit Sale Price</Label>
                    <Input
                      id={`items.${index}.unit_sale_price`}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register(`items.${index}.unit_sale_price`, { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                    {form.formState.errors.items?.[index]?.unit_sale_price && <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.unit_sale_price?.message}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="mb-1">Note</Label>
                    <Input
                      id={`items.${index}.note`}
                      type="text"
                      {...form.register(`items.${index}.note`)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Label className="mb-1">Line Total</Label>
                    <p className="font-semibold whitespace-nowrap">{formatCurrency(lineTotal)}</p>
                  </div>
                  <div className="flex justify-end items-center">
                    {itemFields.length > 1 && (
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)} disabled={isLoading} aria-label="Remove Item">
                        <XCircle className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex">
              <Button
                type="button"
                variant="outline"
                onClick={() => appendItem({ tempId: crypto.randomUUID(), product_id: '', quantity: 0, unit_sale_price: 0, note: null })}
                disabled={isLoading}
                className="ml-auto"
              >
                <PlusCircle className="mr-2 h-5 w-5" /> Add Item
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center text-xl font-bold mt-6 mb-2">
            <span>Overall Total:</span>
            <span>{formatCurrency(overallTotalAmount)}</span>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isNewSale ? "Adding Sale..." : "Saving Changes...") : (isNewSale ? "Add Sale" : "Save Changes")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}