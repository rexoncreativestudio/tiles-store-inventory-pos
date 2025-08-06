"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface WarehouseOption {
  id: string;
  name: string;
  quantity: number;
}

interface WarehouseDeduction {
  id: string;
  name: string;
  deducted: number;
}

interface AddToCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  salePrice: number;
  userRole?: string;
  warehouses: WarehouseOption[];
  initialQty?: number;
  initialNote?: string;
  initialSalePrice?: number;
  onSubmit: (data: { qty: number; salePrice: number; selectedWarehouses: WarehouseDeduction[]; note: string }) => void;
}

const AddToCartDialog: React.FC<AddToCartDialogProps> = ({
  open,
  onOpenChange,
  productName,
  salePrice,
  userRole = "",
  warehouses,
  initialQty = 1,
  initialNote = "",
  initialSalePrice,
  onSubmit,
}) => {
  // Sale price editing
  const [salePriceInput, setSalePriceInput] = useState<string>(
    initialSalePrice !== undefined ? String(initialSalePrice) : String(salePrice)
  );
  const [salePriceError, setSalePriceError] = useState<string>("");

  // Quantity and warehouse logic
  const [qty, setQty] = useState<string>(initialQty ? String(initialQty) : "");
  const [warehouseSelections, setWarehouseSelections] = useState<WarehouseDeduction[]>([]);
  const [note, setNote] = useState<string>(initialNote);

  // Reset fields when dialog is opened
  useEffect(() => {
    if (open) {
      setQty(initialQty ? String(initialQty) : "");
      setSalePriceInput(
        initialSalePrice !== undefined ? String(initialSalePrice) : String(salePrice)
      );
      setSalePriceError("");
      setNote(initialNote || "");
    }
  }, [open, initialQty, initialSalePrice, salePrice, initialNote]);

  // Sale price validation for cashier
  useEffect(() => {
    const priceNum = parseFloat(salePriceInput);
    if (
      userRole.toLowerCase() === "cashier" &&
      priceNum < salePrice
    ) {
      setSalePriceError(
        `Cashiers cannot set a sale price below the registered sale price (${salePrice}).`
      );
    } else {
      setSalePriceError("");
    }
  }, [salePriceInput, salePrice, userRole]);

  useEffect(() => {
    // Only run selections if qty is a valid positive number
    const numericQty = parseInt(qty, 10);
    if (!numericQty || numericQty < 1) {
      setWarehouseSelections([]);
      return;
    }
    let remaining = numericQty;
    const selections: WarehouseDeduction[] = [];
    for (const wh of warehouses) {
      if (remaining <= 0) break;
      const canDeduct = Math.min(wh.quantity, remaining);
      if (canDeduct > 0) {
        selections.push({ id: wh.id, name: wh.name, deducted: canDeduct });
        remaining -= canDeduct;
      }
    }
    setWarehouseSelections(selections);
  }, [warehouses, qty]);

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQty(e.target.value);
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalePriceInput(e.target.value);
  };

  const handleWarehouseCheckbox = (id: string) => {
    setWarehouseSelections((prev) => {
      const exists = prev.find((w) => w.id === id);
      if (exists) {
        return prev.filter((w) => w.id !== id);
      } else {
        const wh = warehouses.find((w) => w.id === id);
        if (!wh) return prev;
        const already = prev.reduce((s, w) => s + w.deducted, 0);
        const numericQty = parseInt(qty, 10);
        const need = Math.max((numericQty || 0) - already, 0);
        if (need === 0) return prev;
        return [...prev, { id, name: wh.name, deducted: Math.min(wh.quantity, need) }];
      }
    });
  };

  const handleDeductedChange = (id: string, value: number) => {
    setWarehouseSelections((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              deducted: Math.max(
                0,
                Math.min(value, warehouses.find((wh) => wh.id === id)?.quantity || 0)
              ),
            }
          : w
      )
    );
  };

  const numericQty = parseInt(qty, 10);
  const salePriceNum = parseFloat(salePriceInput);
  const totalSelected = warehouseSelections.reduce((s, w) => s + w.deducted, 0);
  const canSubmit =
    !!numericQty &&
    numericQty > 0 &&
    totalSelected === numericQty &&
    warehouseSelections.length > 0 &&
    !!salePriceInput &&
    !salePriceError &&
    salePriceNum >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = warehouseSelections.filter((w) => w.deducted > 0);
    if (canSubmit) {
      onSubmit({
        qty: numericQty,
        salePrice: salePriceNum,
        selectedWarehouses: filtered,
        note,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Item to Cart</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mb-4">
            Enter quantity, sale price, select warehouses, and add an optional note.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
          {/* Product */}
          <div>
            <Label className="mb-2 block text-base font-semibold">Product</Label>
            <Input
              value={productName}
              onChange={() => {}}
              className="h-12 text-base"
              disabled
            />
          </div>
          {/* Quantity */}
          <div>
            <Label htmlFor="qty" className="mb-2 block text-base font-semibold">
              Quantity
            </Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              autoFocus
              onChange={handleQtyChange}
              className="h-12 text-base"
              placeholder="Enter quantity"
            />
          </div>
          {/* Sale Price */}
          <div>
            <Label htmlFor="saleprice" className="mb-2 block text-base font-semibold">
              Sale Price
            </Label>
            <Input
              id="saleprice"
              type="number"
              min={0}
              step="0.01"
              value={salePriceInput}
              onChange={handleSalePriceChange}
              className={`h-12 text-base ${salePriceError ? "border-red-400" : ""}`}
              placeholder={`Registered price: ${salePrice}`}
            />
            {salePriceError && (
              <div className="text-xs text-red-600 mt-1">
                {salePriceError}
              </div>
            )}
          </div>
          {/* Warehouses */}
          <div>
            <Label className="mb-2 block text-base font-semibold">Warehouses</Label>
            <div className="flex flex-col gap-2">
              {warehouses.map((wh) => {
                const selected = warehouseSelections.find((w) => w.id === wh.id);
                return (
                  <label
                    key={wh.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                      ${
                        selected
                          ? "bg-green-50 border-green-400 shadow-sm"
                          : "hover:bg-green-100 border-green-200"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => handleWarehouseCheckbox(wh.id)}
                      className="accent-green-600 w-5 h-5 rounded"
                      style={{ accentColor: "#16a34a" }}
                    />
                    <span className="font-medium text-green-700">
                      {wh.name}:
                    </span>
                    <span className="text-sm text-gray-700">
                      {wh.quantity} in stock
                    </span>
                    {selected && (
                      <span className="ml-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                        Deduct:
                        <Input
                          type="number"
                          min={0}
                          max={wh.quantity}
                          value={selected.deducted}
                          onChange={e => handleDeductedChange(wh.id, parseInt(e.target.value) || 0)}
                          style={{ width: "60px" }}
                          className="border rounded px-1 py-0.5 text-xs ml-1"
                        />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {numericQty > 0 && totalSelected !== numericQty && (
              <div className="text-xs text-red-600 mt-1">
                Total selected ({totalSelected}) does not match required ({numericQty}).
              </div>
            )}
          </div>
          {/* Notes */}
          <div>
            <Label htmlFor="note" className="mb-2 block text-base font-semibold">
              Note (Optional)
            </Label>
            <Input
              id="note"
              value={note}
              placeholder="e.g., chipped corner"
              onChange={(e) => setNote(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={!canSubmit}
            >
              Update Cart Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartDialog; 