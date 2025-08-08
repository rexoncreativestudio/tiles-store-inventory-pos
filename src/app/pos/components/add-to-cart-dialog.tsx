"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface WarehouseOption {
  id: string;
  name: string;
  quantity: number;
}

export interface WarehouseDeduction {
  id: string;
  name: string;
  deducted: number;
}

interface AddToCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productSalePrice: number;
  currentUserRole?: string;
  warehouses: WarehouseOption[];
  initialQty?: number;
  initialNote?: string;
  initialSalePrice?: number;
  initialSaleDate?: Date;
  onSubmit: (data: {
    qty: number;
    salePrice: number;
    selectedWarehouses: WarehouseDeduction[];
    note: string;
    saleDate: Date;
  }) => void;
}

const AddToCartDialog: React.FC<AddToCartDialogProps> = ({
  open,
  onOpenChange,
  productName,
  productSalePrice,
  currentUserRole = "",
  warehouses,
  initialQty = 1,
  initialNote = "",
  initialSalePrice,
  initialSaleDate,
  onSubmit,
}) => {
  // Memoize initial values for stability
  const memoizedInitialQty = useMemo(() => initialQty, [initialQty]);
  const memoizedInitialSalePrice = useMemo(() => initialSalePrice, [initialSalePrice]);
  const memoizedSalePrice = useMemo(() => productSalePrice, [productSalePrice]);
  const memoizedInitialNote = useMemo(() => initialNote, [initialNote]);
  const memoizedInitialSaleDate = useMemo(
    () => initialSaleDate ?? new Date(),
    [initialSaleDate]
  );

  // Sale price editing
  const [salePriceInput, setSalePriceInput] = useState<string>(
    memoizedInitialSalePrice !== undefined ? String(memoizedInitialSalePrice) : String(memoizedSalePrice)
  );
  const [salePriceError, setSalePriceError] = useState<string>("");

  // Quantity and warehouse logic
  const [qty, setQty] = useState<string>(memoizedInitialQty ? String(memoizedInitialQty) : "");
  const [warehouseSelections, setWarehouseSelections] = useState<WarehouseDeduction[]>([]);
  const [note, setNote] = useState<string>(memoizedInitialNote);

  // Sale date & time logic
  const [saleDate, setSaleDate] = useState<Date>(memoizedInitialSaleDate);
  // store time as string "HH:mm"
  const [saleTime, setSaleTime] = useState<string>(
    format(memoizedInitialSaleDate, "HH:mm")
  );

  // Reset fields when dialog is opened or memoized props change
  useEffect(() => {
    if (open) {
      setQty(memoizedInitialQty ? String(memoizedInitialQty) : "");
      setSalePriceInput(
        memoizedInitialSalePrice !== undefined ? String(memoizedInitialSalePrice) : String(memoizedSalePrice)
      );
      setSalePriceError("");
      setNote(memoizedInitialNote || "");
      setSaleDate(memoizedInitialSaleDate);
      setSaleTime(format(memoizedInitialSaleDate, "HH:mm"));
    }
  }, [open, memoizedInitialQty, memoizedInitialSalePrice, memoizedSalePrice, memoizedInitialNote, memoizedInitialSaleDate]);

  useEffect(() => {
    const priceNum = parseFloat(salePriceInput);
    if (
      currentUserRole.toLowerCase() === "cashier" &&
      priceNum < memoizedSalePrice
    ) {
      setSalePriceError(
        `Cashiers cannot set a sale price below the registered sale price (${memoizedSalePrice}).`
      );
    } else {
      setSalePriceError("");
    }
  }, [salePriceInput, memoizedSalePrice, currentUserRole]);

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

  // --- Calendar handlers ---
  const handleSaleDateChange = (date: Date | undefined) => {
    if (date) {
      // keep time from saleTime
      const [hour, min] = saleTime.split(":");
      date.setHours(Number(hour), Number(min), 0, 0);
      setSaleDate(new Date(date));
    }
  };
  const handleSaleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaleTime(e.target.value);
    if (saleDate) {
      const [hour, min] = e.target.value.split(":");
      let newDate = new Date(saleDate);
      newDate.setHours(Number(hour), Number(min), 0, 0);
      setSaleDate(newDate);
    }
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
    salePriceNum >= 0 &&
    saleDate instanceof Date &&
    !isNaN(saleDate.getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = warehouseSelections.filter((w) => w.deducted > 0);
    if (canSubmit) {
      onSubmit({
        qty: numericQty,
        salePrice: salePriceNum,
        selectedWarehouses: filtered,
        note,
        saleDate,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Item to Cart</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mb-4">
            Enter quantity, sale price, select warehouses, sale date, and an optional note.
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
              placeholder={`Registered price: ${memoizedSalePrice}`}
            />
            {salePriceError && (
              <div className="text-xs text-red-600 mt-1">
                {salePriceError}
              </div>
            )}
          </div>
          {/* Sale Date (calendar + time input) */}
          <div>
            <Label htmlFor="sale-date" className="mb-2 block text-base font-semibold">
              Sale Date
            </Label>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-12",
                      !saleDate && "text-muted-foreground"
                    )}
                  >
                    {saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={saleDate}
                    onSelect={handleSaleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={saleTime}
                onChange={handleSaleTimeChange}
                className="h-12 w-[120px]"
              />
            </div>
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