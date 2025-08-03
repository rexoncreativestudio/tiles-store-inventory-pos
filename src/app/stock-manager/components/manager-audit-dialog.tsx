"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useForm, SubmitHandler, useFieldArray, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PendingAuditRecordForManager, ManagerAuditFormValues, managerAuditFormSchema } from "../types";

interface ManagerAuditDialogProps {
  auditToProcess?: PendingAuditRecordForManager;
  currentManagerId: string;
  currentUserBranchId: string | null; 
  isOpen: boolean;
  onClose: () => void;
  onAuditProcessed: () => void;
}

function formatDateDisplay(isoString: string | null): string {
  if (!isoString) return "N/A";
  const date = parseISO(isoString);
  return isNaN(date.getTime()) ? "Invalid Date" : format(date, "PPP p");
}

export default function ManagerAuditDialog({
  auditToProcess,
  currentManagerId,
  currentUserBranchId, 
  isOpen,
  onClose,
  onAuditProcessed,
}: ManagerAuditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ManagerAuditFormValues>({
    resolver: zodResolver(managerAuditFormSchema),
    defaultValues: { audit_id: "", status: "approved", manager_notes: "", audited_products: [] },
  });

  const { fields } = useFieldArray({ control: form.control, name: "audited_products" });

  useEffect(() => {
    if (isOpen && auditToProcess) {
      form.reset({
        audit_id: auditToProcess.id,
        status: auditToProcess.status === "rejected" ? "rejected" : "approved",
        manager_notes: auditToProcess.notes_from_manager || "",
        audited_products: auditToProcess.submission_details.map((item) => ({
          product_name: item.product_name,
          product_ref: item.product_ref,
          quantity: item.quantity,
          product_unit_abbreviation: item.product_unit_abbreviation || null,
          category_id: item.category_id || null,
          purchase_price: item.purchase_price ?? null,
          sale_price: item.sale_price ?? null,
        })),
      });
      form.clearErrors();
    }
  }, [isOpen, auditToProcess, form]);

  const onSubmit: SubmitHandler<ManagerAuditFormValues> = async (values) => {
    setIsLoading(true);
    
    // --- FIX: Correctly structure the payload for the RPC call ---
    const payload = {
      p_audit_id: values.audit_id,
      p_auditor_id: currentManagerId,
      p_manager_notes: values.manager_notes || null,
      p_audited_products_details: values.audited_products,
      p_status: values.status,
      p_auditor_branch_id: currentUserBranchId,
    };

    const { data: rpcResponse, error: rpcError } = await supabaseClient.rpc("process_stock_audit", payload);

    if (rpcError) {
      toast.error(`A system error occurred: ${rpcError.message}`);
    } else if (rpcResponse && (rpcResponse as any).status === 'error') {
      toast.error("Audit process failed:", { description: (rpcResponse as any).message });
    } else {
      toast.success(`Stock audit has been successfully ${values.status}!`);
      onAuditProcessed();
    }
    setIsLoading(false);
  };

  const onInvalid = (errors: FieldErrors<ManagerAuditFormValues>) => {
    const errorMessage = errors.audited_products?.message || "Please check the form for errors.";
    toast.error("Validation Failed", { description: errorMessage });
  };

  const isApprovedStatus = form.watch("status") === "approved";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Audit Stock Submission</DialogTitle>
          <DialogDescription>Review and process the submission. Prices are required for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex-grow overflow-y-auto pr-6 pl-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>Warehouse:</strong> {auditToProcess?.warehouses?.name || "N/A"}</p>
            <p><strong>Controller:</strong> {auditToProcess?.recorded_by_controller_user?.email || "N/A"}</p>
            <p><strong>Submission Date:</strong> {formatDateDisplay(auditToProcess?.submission_date || null)}</p>
            <p><strong>Controller Notes:</strong> {auditToProcess?.notes_from_controller || "N/A"}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Audit Status</Label>
              <Select onValueChange={(value: "approved" | "rejected") => form.setValue("status", value, { shouldValidate: true })} value={form.watch("status")} disabled={isLoading}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="approved">Approve</SelectItem><SelectItem value="rejected">Reject</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager_notes">Manager Notes (Optional)</Label>
              <Textarea id="manager_notes" placeholder="Reason for rejection or other notes..." {...form.register("manager_notes")} disabled={isLoading} />
            </div>
          </div>
          <Separator />
          <h3 className="text-lg font-semibold">Products for Audit</h3>
          {form.formState.errors.audited_products?.message && <p className="text-sm font-medium text-destructive bg-red-100 p-3 rounded-md">{form.formState.errors.audited_products.message}</p>}
          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-4 bg-gray-50">
                {/* --- FIX: Responsive grid layout for product cards --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label>Product</Label>
                    <p className="text-sm font-medium p-2 bg-white rounded-md border">{field.product_name} ({field.product_ref})</p>
                    <p className="text-xs text-muted-foreground">Qty: {field.quantity}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`audited_products.${index}.purchase_price`}>Purchase Price</Label>
                    <Controller control={form.control} name={`audited_products.${index}.purchase_price`} render={({ field: ctlField }) => <Input type="number" step="0.01" min={0} required={isApprovedStatus} {...ctlField} value={ctlField.value ?? ""} onChange={(e) => ctlField.onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={isLoading || !isApprovedStatus} />} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`audited_products.${index}.sale_price`}>Sale Price</Label>
                    <Controller control={form.control} name={`audited_products.${index}.sale_price`} render={({ field: ctlField }) => <Input type="number" step="0.01" min={0} required={isApprovedStatus} {...ctlField} value={ctlField.value ?? ""} onChange={(e) => ctlField.onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={isLoading || !isApprovedStatus} />} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit, onInvalid)} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</> : `Process as ${form.watch("status")}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
