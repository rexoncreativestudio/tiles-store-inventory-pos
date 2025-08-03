// src/app/dashboard/stock/components/stock-adjustment-button.tsx
"use client";

import React, { useState, useMemo } from 'react'; // CORRECTED: Added useMemo import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusCircle, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabaseClient } from '@/lib/supabase/client';


// Type Definitions (Copied for clarity, but ideally in a shared types file for dashboard/stock)
type ProductForStock = {
  id: string;
  name: string;
  unique_reference: string;
  low_stock_threshold: number;
  product_unit_abbreviation: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
};

type WarehouseForFilter = {
  id: string;
  name: string;
};

interface StockAdjustmentButtonProps {
  products: ProductForStock[];
  warehouses: WarehouseForFilter[];
  currentUserId: string; // New prop for the current user's ID
}

export default function StockAdjustmentButton({ products, warehouses, currentUserId }: StockAdjustmentButtonProps) {
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isProcessingAdjustment, setIsProcessingAdjustment] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);

  const handleAdjustStockSubmit = async () => {
    setIsProcessingAdjustment(true);
    if (!selectedProductId || !selectedWarehouseId || adjustmentQuantity === 0) {
      toast.error("Please select a product and warehouse, and enter a non-zero adjustment quantity.");
      setIsProcessingAdjustment(false);
      return;
    }

    const { data, error } = await supabaseClient.rpc('adjust_stock_quantity', {
        p_product_id: selectedProductId,
        p_warehouse_id: selectedWarehouseId,
        p_quantity_change: adjustmentQuantity,
        p_user_id: currentUserId,
        p_reason: adjustmentReason || null
    });

    if (error) {
        toast.error("Failed to adjust stock.", { description: error.message });
        console.error("Stock adjustment RPC error:", error);
    } else {
        toast.success(`Stock adjusted successfully! New quantity: ${data.new_quantity}`);
    }

    setIsProcessingAdjustment(false);
    setIsAdjustmentDialogOpen(false);

    setSelectedProductId(null);
    setSelectedWarehouseId(null);
    setAdjustmentQuantity(0);
    setAdjustmentReason('');
  };

  const selectedProductName = useMemo(() => {
    return products.find(product => product.id === selectedProductId)?.name || 'Select a product';
  }, [selectedProductId, products]);

  return (
    <>
      <Button onClick={() => setIsAdjustmentDialogOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" /> Stock Adjustment
      </Button>

      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
            <DialogDescription>
              Adjust product quantity in a specific warehouse. Enter a positive number to increase, negative to decrease.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Product Select (Searchable Combobox) */}
            <div className="grid gap-1">
              <Label htmlFor="product_select">Product</Label>
              <Popover open={isProductSelectOpen} onOpenChange={setIsProductSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isProductSelectOpen}
                    className="w-full justify-between"
                    disabled={isProcessingAdjustment}
                  >
                    {selectedProductName}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search product..." />
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={product.name + " " + product.unique_reference}
                            onSelect={() => {
                              setSelectedProductId(product.id);
                              setIsProductSelectOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {product.name} ({product.unique_reference})
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Warehouse Select (Standard) */}
            <div className="grid gap-1">
              <Label htmlFor="warehouse_select">Warehouse</Label>
              <Select onValueChange={setSelectedWarehouseId} value={selectedWarehouseId || ''} disabled={isProcessingAdjustment}>
                <SelectTrigger id="warehouse_select">
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="adjustment_quantity">Adjustment</Label>
              <Input
                id="adjustment_quantity"
                type="number"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(Number(e.target.value))}
                placeholder="0"
                disabled={isProcessingAdjustment}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="adjustment_reason">Reason</Label>
              <Input
                id="adjustment_reason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Stock take adjustment, damaged items, returned goods"
                disabled={isProcessingAdjustment}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdjustStockSubmit} disabled={isProcessingAdjustment}>
              {isProcessingAdjustment ? <Loader2 className="animate-spin mr-2" /> : 'Adjust Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}