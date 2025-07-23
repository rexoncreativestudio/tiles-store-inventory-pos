// src/app/dashboard/stock/stock-adjustment-actions.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { PlusCircle, Loader2, Pencil, Check, ChevronsUpDown } from 'lucide-react';
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";


// Define the shape of a stock item for adjustment
type StockItemToAdjust = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  products: {
    id: string;
    unique_reference: string;
    name: string;
    low_stock_threshold: number;
  } | null;
  warehouses: {
    id: string;
    name: string;
  } | null;
};

// Define types for select options
type ProductForSelect = {
  id: string;
  unique_reference: string;
  name: string;
};

type WarehouseForSelect = {
  id: string;
  name: string;
};

// CORRECTED: Zod schema for stock adjustment form validation - FINALIZED
const stockAdjustmentFormSchema = z.object({
  product_id: z.string().uuid({ message: "Invalid product selected." }).nullable(),
  warehouse_id: z.string().uuid({ message: "Invalid warehouse selected." }).nullable(),
  // FINAL FIX: Remove invalid_type_error and required_error from the options object.
  // Use .min() for both requiredness and non-zero check, and .refine() for NaN.
  adjustment_quantity: z.number()
    .min(0.00000001, { message: "Adjustment quantity is required and must be a non-zero number." }) // Ensures it's required AND not zero AND a number
    .refine(val => !isNaN(val), { // This catches cases where valueAsNumber returns NaN (e.g., empty string)
      message: "Quantity must be a valid number.",
    }),
  reason: z.string().min(1, { message: "Reason is required" }),
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentFormSchema>;

interface StockAdjustmentActionsProps {
  products: ProductForSelect[];
  warehouses: WarehouseForSelect[];
  currentUserId: string;
  stockItemToAdjust?: StockItemToAdjust;
}

export default function StockAdjustmentActions({ products, warehouses, currentUserId, stockItemToAdjust }: StockAdjustmentActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);
  const [isWarehouseComboboxOpen, setIsWarehouseComboboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: stockItemToAdjust
      ? {
          product_id: stockItemToAdjust.product_id,
          warehouse_id: stockItemToAdjust.warehouse_id,
          adjustment_quantity: stockItemToAdjust.quantity,
          reason: "",
        }
      : {
          product_id: 'null-product',
          warehouse_id: 'null-warehouse',
          adjustment_quantity: 0,
          reason: "",
        },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(stockItemToAdjust ? {
        product_id: stockItemToAdjust.product_id,
        warehouse_id: stockItemToAdjust.warehouse_id,
        adjustment_quantity: stockItemToAdjust.quantity,
        reason: "",
      } : {
        product_id: 'null-product',
        warehouse_id: 'null-warehouse',
        adjustment_quantity: 0,
        reason: "",
      });
      form.clearErrors();
    }
  }, [isDialogOpen, stockItemToAdjust, form]);

  const onSubmit: SubmitHandler<StockAdjustmentFormValues> = async (values) => {
    setIsLoading(true);
    let error = null;

    const selectedProductId = values.product_id === 'null-product' ? null : values.product_id;
    const selectedWarehouseId = values.warehouse_id === 'null-warehouse' ? null : values.warehouse_id;

    if (!selectedProductId || !selectedWarehouseId) {
      toast.error("Please select a valid product and warehouse.");
      setIsLoading(false);
      return;
    }

    const { data: existingStock, error: fetchStockError } = await supabaseClient
      .from('stock')
      .select('id, quantity')
      .eq('product_id', selectedProductId)
      .eq('warehouse_id', selectedWarehouseId)
      .single();

    if (fetchStockError && fetchStockError.code !== 'PGRST116') {
      toast.error("Error checking existing stock.", { description: fetchStockError.message });
      setIsLoading(false);
      return;
    }

    const newQuantity = (existingStock?.quantity || 0) + values.adjustment_quantity;

    if (newQuantity < 0) {
      toast.error("Cannot adjust stock to a negative quantity.", { description: `Attempting to set quantity to ${newQuantity}. Current: ${existingStock?.quantity || 0}, Adjustment: ${values.adjustment_quantity}.` });
      setIsLoading(false);
      return;
    }

    if (existingStock) {
      const { error: updateError } = await supabaseClient
        .from('stock')
        .update({
          quantity: newQuantity,
          last_updated_by_user_id: currentUserId,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', existingStock.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabaseClient
        .from('stock')
        .insert({
          product_id: selectedProductId,
          warehouse_id: selectedWarehouseId,
          quantity: newQuantity,
          last_updated_by_user_id: currentUserId,
          last_updated_at: new Date().toISOString(),
        });
      error = insertError;
    }

    if (error) {
      toast.error("Failed to adjust stock.", { description: error.message });
    } else {
      toast.success("Stock adjusted successfully!");
      setIsDialogOpen(false);
      router.refresh();
    }
    setIsLoading(false);
  };

  // Get display name for selected product in combobox
  const selectedProductDisplayName = stockItemToAdjust?.products?.name ||
                                    (form.watch("product_id") !== 'null-product' && products.find(p => p.id === form.watch("product_id"))?.name) ||
                                    "Select a product...";

  // Get display name for selected warehouse in combobox
  const selectedWarehouseDisplayName = stockItemToAdjust?.warehouses?.name ||
                                       (form.watch("warehouse_id") !== 'null-warehouse' && warehouses.find(w => w.id === form.watch("warehouse_id"))?.name) ||
                                       "Select a warehouse...";


  return (
    <>
      {!stockItemToAdjust && (
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Stock Adjustment
        </Button>
      )}

      {stockItemToAdjust && (
        <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} title="Adjust Stock">
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{stockItemToAdjust ? `Adjust Stock for ${stockItemToAdjust.products?.name}` : "New Stock Adjustment"}</DialogTitle>
            <DialogDescription>
              Adjust product quantity in a specific warehouse. Enter a positive number to increase, negative to decrease.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_id" className="text-right">
                Product
              </Label>
              {/* Product Combobox */}
              <Popover open={isProductComboboxOpen} onOpenChange={setIsProductComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isProductComboboxOpen}
                    className="col-span-3 justify-between"
                    disabled={isLoading || !!stockItemToAdjust}
                  >
                    {selectedProductDisplayName}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search product..." />
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="null-product-option"
                        onSelect={() => {
                          form.setValue("product_id", 'null-product', { shouldValidate: true });
                          setIsProductComboboxOpen(false);
                        }}
                      >
                        None
                      </CommandItem>
                      {products.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} (${p.unique_reference})`}
                          onSelect={() => {
                            form.setValue("product_id", p.id, { shouldValidate: true });
                            setIsProductComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              p.id === form.watch("product_id") ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {p.name} ({p.unique_reference})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.formState.errors.product_id && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.product_id.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="warehouse_id" className="text-right">
                Warehouse
              </Label>
              <Popover open={isWarehouseComboboxOpen} onOpenChange={setIsWarehouseComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isWarehouseComboboxOpen}
                    className="col-span-3 justify-between"
                    disabled={isLoading || !!stockItemToAdjust}
                  >
                    {selectedWarehouseDisplayName}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search warehouse..." />
                    <CommandEmpty>No warehouse found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="null-warehouse-option"
                        onSelect={() => {
                          form.setValue("warehouse_id", 'null-warehouse', { shouldValidate: true });
                          setIsWarehouseComboboxOpen(false);
                        }}
                      >
                        None
                      </CommandItem>
                      {warehouses.map((w) => (
                        <CommandItem
                          key={w.id}
                          value={w.name}
                          onSelect={() => {
                            form.setValue("warehouse_id", w.id, { shouldValidate: true });
                            setIsWarehouseComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              w.id === form.watch("warehouse_id") ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {w.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.formState.errors.warehouse_id && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.warehouse_id.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjustment_quantity" className="text-right">
                Adjustment
              </Label>
              <Input
                id="adjustment_quantity"
                type="number"
                step="0.01"
                placeholder="e.g., 5 (increase) or -3 (decrease)"
                className="col-span-3"
                {...form.register("adjustment_quantity", { valueAsNumber: true })}
                disabled={isLoading}
              />
              {form.formState.errors.adjustment_quantity && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.adjustment_quantity.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., Stock take adjustment, damaged items, returned goods"
                className="col-span-3"
                {...form.register("reason")}
                disabled={isLoading}
              />
              {form.formState.errors.reason && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.reason.message}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adjusting...</> : "Adjust Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}