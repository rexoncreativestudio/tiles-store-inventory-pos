"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { UseFormReturn, SubmitHandler } from "react-hook-form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type PaymentFormValues = {
  amountReceived: number;
  customerName?: string;
  customerPhone?: string;
  status: "completed" | "held";
  date: Date;
};

interface PaymentDialogModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: SubmitHandler<PaymentFormValues>;
  isProcessing: boolean;
  grandTotal: number;
  formatCurrency: (amount: number) => string;
  form: UseFormReturn<PaymentFormValues>;
}

export default function PosInterfaceClientPaymentDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isProcessing,
  grandTotal,
  formatCurrency: _formatCurrency,
  form,
}: PaymentDialogModalProps) {
  const amountReceived = form.watch("amountReceived");
  const status = form.watch("status");
  const date = form.watch("date");

  useEffect(() => {
    if ((amountReceived || 0) < grandTotal) {
      if (status !== "held") {
        form.setValue("status", "held", { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [amountReceived, grandTotal, status, form]);

  useEffect(() => {
    if (!date) {
      form.setValue("date", new Date());
    }
  }, [date, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Process Payment</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mb-4">
            Finalize the sale and calculate change.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 py-2"
        >
          <div>
            <Label htmlFor="amountReceived" className="mb-2 block text-base font-semibold">
              Amount Received
            </Label>
            <Input
              id="amountReceived"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="9999999.99"
              className="h-12 text-2xl font-bold"
              placeholder="0.00"
              {...form.register("amountReceived", {
                valueAsNumber: true,
                required: true,
                validate: (val) =>
                  val !== undefined &&
                  !isNaN(val) &&
                  /^\d+(\.\d{1,2})?$/.test(val.toString()) ||
                  "Amount must be a number with up to 2 decimal places",
              })}
              onWheel={e => (e.target as HTMLInputElement).blur()}
            />
            {form.formState.errors.amountReceived && (
              <span className="text-red-500 text-xs mt-1 block">
                {form.formState.errors.amountReceived.message}
              </span>
            )}
          </div>
          {/* --- Date Field with Shadcn UI Calendar --- */}
          <div>
            <Label htmlFor="date" className="mb-2 block text-base font-semibold">
              Payment Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => form.setValue("date", selectedDate!)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <span className="text-red-500 text-xs mt-1 block">
                {form.formState.errors.date.message || "Date is required"}
              </span>
            )}
          </div>
          {/* --- End Date Field --- */}
          <div>
            <Label htmlFor="customerName" className="mb-2 block text-base font-semibold">
              Customer Name (Optional)
            </Label>
            <Input
              id="customerName"
              className="h-12 text-base"
              {...form.register("customerName")}
            />
          </div>
          <div>
            <Label htmlFor="customerPhone" className="mb-2 block text-base font-semibold">
              Customer Phone (Optional)
            </Label>
            <Input
              id="customerPhone"
              className="h-12 text-base"
              {...form.register("customerPhone")}
            />
          </div>
          {/* Status Field */}
          <div>
            <Label className="mb-2 block text-base font-semibold">Status</Label>
            <div className="flex flex-row gap-6">
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                ${form.watch("status") === "completed"
                  ? "bg-green-50 border-green-400 shadow-sm"
                  : "hover:bg-green-100 border-green-200"
                }`}>
                <input
                  type="radio"
                  {...form.register("status")}
                  value="completed"
                  checked={form.watch("status") === "completed"}
                  disabled={(amountReceived || 0) < grandTotal}
                  className="accent-green-600 w-5 h-5 rounded"
                  style={{ accentColor: "#16a34a" }}
                />
                <span className="text-green-700 font-medium">Completed</span>
              </label>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                ${form.watch("status") === "held"
                  ? "bg-gray-100 border-gray-400 shadow-sm"
                  : "hover:bg-gray-200 border-gray-200"
                }`}>
                <input
                  type="radio"
                  {...form.register("status")}
                  value="held"
                  checked={form.watch("status") === "held"}
                  className="accent-gray-400 w-5 h-5 rounded"
                  style={{ accentColor: "#d1d5db" }}
                />
                <span className="text-gray-700 font-medium">Held</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}