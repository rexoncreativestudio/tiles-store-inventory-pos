// src/app/dashboard/purchases/record-purchase-actions.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { PlusCircle, Loader2, Check, ChevronsUpDown, XCircle } from 'lucide-react';
import { z } from "zod";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrencyFormatter } from '@/lib/formatters';


// Define types for select options (copied for clarity within component)
type ProductForSelect = {
  id: string;
  unique_reference: string;
  name: string;
  purchase_price: number;
};

type WarehouseForSelect = {
  id: string;
  name: string;
};

// Zod Schema for a single purchase item
const purchaseItemSchema = z.object({
  product_id: z.string().uuid({ message: "Product must be selected." }),
  quantity: z.number().min(1, { message: "Quantity must be at least 1." }),
  unit_purchase_price: z.number().min(0, { message: "Unit price must be non-negative." }),
});

// Zod Schema for the main purchase form
const recordPurchaseFormSchema = z.object({
  warehouse_id: z.string().uuid({ message: "Warehouse must be selected." }),
  purchase_date: z.string().min(1, { message: "Purchase date is required." }),
  items: z.array(purchaseItemSchema).min(1, { message: "At least one item is required for a purchase." }),
});

type RecordPurchaseFormValues = z.infer<typeof recordPurchaseFormSchema>;

interface RecordPurchaseActionsProps {
  products: ProductForSelect[];
  warehouses: WarehouseForSelect[];
  currentUserId: string;
}

export default function RecordPurchaseActions({ products, warehouses, currentUserId }: RecordPurchaseActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();

  const form = useForm<RecordPurchaseFormValues>({
    resolver: zodResolver(recordPurchaseFormSchema),
    defaultValues: {
      warehouse_id: 'null-warehouse',
      purchase_date: new Date().toISOString().split('T')[0],
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    // Reset form and add a default empty item when dialog opens
    if (isDialogOpen) {
      form.reset({
        warehouse_id: 'null-warehouse',
        purchase_date: new Date().toISOString().split('T')[0],
        items: [],
      });
      append({ product_id: '', quantity: 0, unit_purchase_price: 0 }); // Add one default empty item
      form.clearErrors();
    }
  }, [isDialogOpen, form, append]);


  const onSubmit: SubmitHandler<RecordPurchaseFormValues> = async (values) => {
    setIsLoading(true);
    let error = null;

    const selectedWarehouseId = values.warehouse_id === 'null-warehouse' ? null : values.warehouse_id;

    if (!selectedWarehouseId) {
      toast.error("Please select a valid warehouse.");
      setIsLoading(false);
      return;
    }

    const purchaseItemsPayload = values.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_purchase_price: item.unit_purchase_price,
      total_cost: item.quantity * item.unit_purchase_price,
    }));

    const totalCost = purchaseItemsPayload.reduce((sum, item) => sum + item.total_cost, 0);

    // Call the database function to process the purchase
    const { error: funcError } = await supabaseClient.rpc('process_purchase_transaction', {
        purchase_data: {
            warehouse_id: selectedWarehouseId,
            purchase_date: values.purchase_date,
            registered_by_user_id: currentUserId,
            total_cost: totalCost,
            items: purchaseItemsPayload
        }
    });

    if (funcError) {
        error = funcError;
        toast.error("Failed to record purchase.", { description: funcError.message });
    }

    if (error) {
      toast.error("Failed to record purchase.", { description: error.message });
    } else {
      toast.success("Purchase recorded successfully!");
      setIsDialogOpen(false);
      router.refresh(); // Revalidate data for purchases table
    }
    setIsLoading(false);
  };

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" /> Record New Purchase
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Purchase</DialogTitle>
            <DialogDescription>
              Enter details for the new stock purchase and add items.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  {...form.register("purchase_date")}
                  disabled={isLoading}
                />
                {form.formState.errors.purchase_date && <p className="text-red-500 text-sm mt-1">{form.formState.errors.purchase_date.message}</p>}
              </div>
              <div>
                <Label htmlFor="warehouse_id">Warehouse</Label>
                <Select
                  onValueChange={(value) => form.setValue("warehouse_id", value, { shouldValidate: true })}
                  value={form.watch("warehouse_id") || 'null-warehouse'}
                  disabled={isLoading}
                >
                  <SelectTrigger id="warehouse_id">
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null-warehouse">Select a warehouse</SelectItem>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.warehouse_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.warehouse_id.message}</p>}
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-4">Purchase Items</h3>
            <div className="space-y-4">
              {fields.map((item, index) => {
                const productOptions = products.map(p => ({
                  label: `${p.name} (${p.unique_reference})`,
                  value: p.id,
                  purchase_price: p.purchase_price
                }));

                const selectedProduct = productOptions.find(opt => opt.value === form.watch(`items.${index}.product_id`));
                const itemQuantity = form.watch(`items.${index}.quantity`) || 0;
                const itemUnitPrice = form.watch(`items.${index}.unit_purchase_price`) || 0;
                const itemTotal = itemQuantity * itemUnitPrice;

                return (
                  // CORRECTED: Grid layout for each item row
                  <div key={item.id} className="grid grid-cols-[3fr_1.5fr_1.5fr_2fr_0.2fr] gap-x-2 gap-y-4 items-end border p-4 rounded-md">
                    {/* Product Column */}
                    <div className="col-span-full sm:col-span-1"> {/* Adjust column span for mobile */}
                      <Label htmlFor={`items.${index}.product_id`}>Product</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={false}
                            className="w-full justify-between"
                            disabled={isLoading}
                          >
                            {selectedProduct?.label || "Select product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput placeholder="Search product..." />
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {productOptions.map((productOpt) => (
                                <CommandItem
                                  key={productOpt.value}
                                  value={productOpt.label}
                                  onSelect={() => {
                                    form.setValue(`items.${index}.product_id`, productOpt.value, { shouldValidate: true });
                                    form.setValue(`items.${index}.unit_purchase_price`, productOpt.purchase_price, { shouldValidate: true });
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      productOpt.value === form.watch(`items.${index}.product_id`) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {productOpt.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.items?.[index]?.product_id && <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.product_id?.message}</p>}
                    </div>

                    {/* Quantity Column */}
                    <div>
                      <Label htmlFor={`items.${index}.quantity`}>Quantity</Label>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                      {form.formState.errors.items?.[index]?.quantity && <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.quantity?.message}</p>}
                    </div>

                    {/* Unit Price Column */}
                    <div>
                      <Label htmlFor={`items.${index}.unit_purchase_price`}>Unit Price</Label>
                      <Input
                        id={`items.${index}.unit_purchase_price`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...form.register(`items.${index}.unit_purchase_price`, { valueAsNumber: true })}
                        disabled={isLoading}
                      />
                      {form.formState.errors.items?.[index]?.unit_purchase_price && <p className="text-red-500 text-sm mt-1">{form.formState.errors.items[index]?.unit_purchase_price?.message}</p>}
                    </div>

                    {/* Total Column */}
                    <div className="flex flex-col items-start sm:items-end"> {/* Align total to end on small screens and up */}
                      <Label className="text-right">Total</Label>
                      <p className="font-medium whitespace-nowrap">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>

                    {/* Remove Button Column */}
                    {index > 0 && ( // Allow removing items except the first one
                      <div className="col-span-full sm:col-span-1 flex justify-start sm:justify-end"> {/* Ensure button is aligned at end */}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={isLoading}
                          className="self-start md:self-end" /* Adjust self-alignment to bottom */
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ product_id: '', quantity: 0, unit_purchase_price: 0 })}
                disabled={isLoading}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</> : "Record Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}