"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useForm, SubmitHandler, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabaseClient } from "@/lib/supabase/client";
import { useCurrencyFormatter } from "@/lib/formatters";

// --- TYPES ---
type ExternalSaleItem = {
  id: string;
  product_name: string;
  product_category_name: string | null; // FIXED: must match types/sales
  product_unit_name: string;
  quantity: number;
  unit_sale_price: number;
  unit_purchase_price_negotiated?: number;
  purchase_price?: number;
  note?: string | null;
};

export type ExternalSaleRecord = {
  id: string;
  sale_date?: string | null;
  cashier_id: string | null;
  branch_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  status?: string;
  transaction_reference?: string;
  payment_method?: string;
  total_amount?: number;
  external_sale_items?: ExternalSaleItem[];
  authorized_by_user_id?: string | null;
  authorization_code_hashed?: string | null;
};

// --- FORM SCHEMA ---
const externalSaleItemSchema = z.object({
  id: z.string(),
  product_name: z.string(),
  product_category_name: z.string().nullable(), // FIXED: allow null
  product_unit_name: z.string(),
  quantity: z.number().min(1, { message: "Quantity must be at least 1." }),
  unit_sale_price: z.number().min(0, { message: "Unit Sale Price required." }),
  purchase_price: z.number().min(0, { message: "Purchase Price required." }),
  note: z.string().nullable().optional(),
});

const externalSaleEditSchema = z.object({
  status: z.enum(["completed", "held", "cancelled"]),
  items: z.array(externalSaleItemSchema).min(1),
});

type ExternalSaleEditFormValues = z.infer<typeof externalSaleEditSchema>;

interface ExternalSaleEditModalClientProps {
  externalSaleToEdit: ExternalSaleRecord;
  isOpen: boolean;
  onClose: () => void;
  onSaleSubmitted: () => void;
}

// --- COMPONENT ---
export default function ExternalSaleEditModalClient({
  externalSaleToEdit,
  isOpen,
  onClose,
  onSaleSubmitted,
}: ExternalSaleEditModalClientProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const [isLoading, setIsLoading] = useState(false);

  // Prepare initial items for the form (map DB field to UI field)
  const initialItems = (externalSaleToEdit.external_sale_items ?? []).map(item => ({
    id: item.id,
    product_name: item.product_name,
    product_category_name: item.product_category_name ?? null, // always null or string
    product_unit_name: item.product_unit_name,
    quantity: item.quantity,
    unit_sale_price: item.unit_sale_price,
    purchase_price: item.unit_purchase_price_negotiated ?? 0,
    note: item.note ?? "",
  }));

  const form = useForm<ExternalSaleEditFormValues>({
    resolver: zodResolver(externalSaleEditSchema),
    defaultValues: {
      status:
        externalSaleToEdit.status === "completed" ||
        externalSaleToEdit.status === "held" ||
        externalSaleToEdit.status === "cancelled"
          ? externalSaleToEdit.status
          : "completed",
      items: initialItems,
    },
  });

  const { fields: itemFields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");

  // Compute total cost and total price
  const overallTotalCost = useMemo(
    () =>
      (watchedItems || []).reduce(
        (sum, item) => sum + (Number(item.purchase_price) * Number(item.quantity)),
        0
      ),
    [watchedItems]
  );
  const overallTotalPrice = useMemo(
    () =>
      (watchedItems || []).reduce(
        (sum, item) => sum + (Number(item.unit_sale_price) * Number(item.quantity)),
        0
      ),
    [watchedItems]
  );

  // Build the external_sale_data object for the function (include id for update)
  const buildExternalSaleData = (values: ExternalSaleEditFormValues) => {
    return {
      id: externalSaleToEdit.id, // <-- CRUCIAL for update!
      sale_date: externalSaleToEdit.sale_date ?? new Date().toISOString(),
      cashier_id: externalSaleToEdit.cashier_id ?? null,
      branch_id: externalSaleToEdit.branch_id ?? null,
      customer_name: externalSaleToEdit.customer_name ?? "",
      customer_phone: externalSaleToEdit.customer_phone ?? "",
      total_amount: overallTotalPrice,
      payment_method: externalSaleToEdit.payment_method ?? "",
      status: values.status,
      transaction_reference: externalSaleToEdit.transaction_reference,
      authorized_by_user_id: externalSaleToEdit.authorized_by_user_id ?? "",
      authorization_code_hashed: externalSaleToEdit.authorization_code_hashed ?? "",
      items: values.items.map(item => ({
        id: item.id,
        product_name: item.product_name,
        product_category_name: item.product_category_name ?? "", // always string for db
        product_unit_name: item.product_unit_name,
        quantity: item.quantity,
        unit_sale_price: item.unit_sale_price,
        unit_purchase_price_negotiated: item.purchase_price,
        total_cost: Number(item.purchase_price) * Number(item.quantity),
        total_price: Number(item.unit_sale_price) * Number(item.quantity),
        note: item.note ?? "",
      })),
    };
  };

  const onSubmit: SubmitHandler<ExternalSaleEditFormValues> = async (values) => {
    setIsLoading(true);

    const externalSaleDataJson = buildExternalSaleData(values);

    // Debug: log the payload before sending
    console.log("Submitting external sale update:", externalSaleDataJson);

    // Call the DB function (will update if id is present, insert if not)
    const { data, error: rpcError } = await supabaseClient.rpc(
      "process_external_sale_transaction",
      { external_sale_data: externalSaleDataJson }
    );

    console.log("Function call response:", { data, rpcError });

    if (rpcError) {
      toast.error("Failed to update external sale.", { description: rpcError.message });
    } else if (data && data.status === "success") {
      toast.success("External sale updated successfully!");
      onClose();
      onSaleSubmitted();
    } else {
      toast.error("Unexpected response", { description: JSON.stringify(data) });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        status:
          externalSaleToEdit.status === "completed" ||
          externalSaleToEdit.status === "held" ||
          externalSaleToEdit.status === "cancelled"
            ? externalSaleToEdit.status
            : "completed",
        items: initialItems,
      });
      form.clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, externalSaleToEdit]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit External Sale: {externalSaleToEdit.transaction_reference}
          </DialogTitle>
          <DialogDescription>
            Change the status or update purchase prices for this external sale.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 py-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="status" className="mb-2">Sale Status</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
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
              )}
            />
            {form.formState.errors.status && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>
            )}
          </div>
          <h4 className="text-xl font-bold mt-6 mb-2">External Sale Items</h4>
          <div className="flex flex-col gap-6">
            {itemFields.map((item, index) => {
              const lineTotalCost =
                Number(form.watch(`items.${index}.purchase_price`) || 0) *
                Number(form.watch(`items.${index}.quantity`) || 0);
              const lineTotalPrice =
                Number(form.watch(`items.${index}.unit_sale_price`) || 0) *
                Number(form.watch(`items.${index}.quantity`) || 0);

              return (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 rounded-lg border bg-gray-50 items-center">
                  <div className="flex flex-col gap-2">
                    <Label className="mb-1">Product</Label>
                    <Input value={item.product_name} disabled />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="mb-1">Unit</Label>
                    <Input value={item.product_unit_name} disabled />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="mb-1">Quantity</Label>
                    <Input
                      type="number"
                      value={form.watch(`items.${index}.quantity`)}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="mb-1">Unit Sale Price</Label>
                    <Input
                      type="number"
                      value={form.watch(`items.${index}.unit_sale_price`)}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="mb-1">Purchase Price</Label>
                    <Controller
                      control={form.control}
                      name={`items.${index}.purchase_price`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          {...field}
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                          disabled={isLoading}
                        />
                      )}
                    />
                    {form.formState.errors.items?.[index]?.purchase_price && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.items[index]?.purchase_price?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="mb-1">Note</Label>
                    <Controller
                      control={form.control}
                      name={`items.${index}.note`}
                      render={({ field }) => (
                        <Input
                          type="text"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isLoading}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1 col-span-full md:col-span-1">
                    <Label className="mb-1 text-xs">Line Total Cost</Label>
                    <p className="font-medium whitespace-nowrap">{formatCurrency(lineTotalCost)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 col-span-full md:col-span-1">
                    <Label className="mb-1 text-xs">Line Total Price</Label>
                    <p className="font-medium whitespace-nowrap">{formatCurrency(lineTotalPrice)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center text-xl font-bold mt-6 mb-2">
            <span>Overall Total Purchase Cost:</span>
            <span>{formatCurrency(overallTotalCost)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold mt-1 mb-2">
            <span>Overall Total Sale Price:</span>
            <span>{formatCurrency(overallTotalPrice)}</span>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}