"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { useCurrencyFormatter } from "@/lib/formatters";

interface TilesCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CalculatorResult = {
  cartons: number | null;
  costPerCarton: number | null;
  totalCost: number | null;
};

export default function TilesCalculatorDialog({ open, onOpenChange }: TilesCalculatorDialogProps) {
  const [requestedSqM, setRequestedSqM] = useState("");
  const [pricePerSqM, setPricePerSqM] = useState("");
  const [areaPerCarton, setAreaPerCarton] = useState("");
  const [result, setResult] = useState<CalculatorResult>({
    cartons: null,
    costPerCarton: null,
    totalCost: null,
  });

  const { formatCurrency } = useCurrencyFormatter();

  useEffect(() => {
    const reqSqM = Number(requestedSqM);
    const priceSqM = Number(pricePerSqM);
    const areaCarton = Number(areaPerCarton);

    if (reqSqM > 0 && priceSqM > 0 && areaCarton > 0) {
      const cartons = Math.ceil(reqSqM / areaCarton);
      const costPerCarton = areaCarton * priceSqM;
      const totalCost = cartons * costPerCarton;
      setResult({ cartons, costPerCarton, totalCost });
    } else {
      setResult({ cartons: null, costPerCarton: null, totalCost: null });
    }
  }, [requestedSqM, pricePerSqM, areaPerCarton]);

  // UI refinement: spacing, field sizes, results styling
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            <Calculator className="inline mr-2" />
            Tiles Pricing Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate the number of cartons and total price for tiles.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-6 py-2">
          <div>
            <Label htmlFor="reqSqM" className="mb-1 block text-base">Requested M²</Label>
            <Input
              id="reqSqM"
              type="number"
              step="0.01"
              placeholder="e.g. 28"
              value={requestedSqM}
              onChange={e => setRequestedSqM(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mb-2"
            />
          </div>
          <div>
            <Label htmlFor="priceSqM" className="mb-1 block text-base">Price per M²</Label>
            <Input
              id="priceSqM"
              type="number"
              step="0.01"
              placeholder="e.g. 3500"
              value={pricePerSqM}
              onChange={e => setPricePerSqM(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mb-2"
            />
          </div>
          <div>
            <Label htmlFor="areaCarton" className="mb-1 block text-base">Surface Area per Carton (M²)</Label>
            <Input
              id="areaCarton"
              type="number"
              step="0.01"
              placeholder="e.g. 1.44"
              value={areaPerCarton}
              onChange={e => setAreaPerCarton(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mb-2"
            />
          </div>
        </form>
        <div className="mt-4 space-y-2">
          <div
            className="flex items-center justify-between px-4 py-3 text-lg font-semibold bg-gray-100"
            style={{ borderRadius: "0.7rem" }}
          >
            <span>Total Cartons</span>
            <span>
              {result.cartons !== null ? result.cartons : "--"}
            </span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3 text-lg font-semibold bg-gray-100"
            style={{ borderRadius: "0.7rem" }}
          >
            <span>Cost per Carton</span>
            <span>
              {result.costPerCarton !== null ? formatCurrency(result.costPerCarton) : "--"}
            </span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3 text-lg font-semibold bg-gray-100"
            style={{ borderRadius: "0.7rem" }}
          >
            <span>Total Cost</span>
            <span>
              {result.totalCost !== null ? formatCurrency(result.totalCost) : "--"}
            </span>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}