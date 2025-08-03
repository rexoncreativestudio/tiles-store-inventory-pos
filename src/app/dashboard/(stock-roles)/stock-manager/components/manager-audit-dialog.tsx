"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useForm, SubmitHandler, useFieldArray, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  PendingAuditRecordForManager,
  ManagerAuditFormValues,
  managerAuditFormSchema,
} from "../types";

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
  if (isNaN(date.getTime())) return "Invalid Date";
  return format(date, "PPP p");
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
    defaultValues: {
      audit_id: auditToProcess?.id || "",
      status: "approved",
      manager_notes: "",
      audited_products: [],
    },
  });

  // Updated generic parameters: third value must be a string (default is "id")
  const { fields } = useFieldArray<ManagerAuditFormValues, "audited_products">({
    control: form.control,
    name: "audited_products",
  });

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
    console.log("✅ Form validation successful. Attempting to submit to the database with these values:", values);
    setIsLoading(true);

    const cleanedAuditedProducts = values.audited_products.map(product => ({
      ...product,
      category_id: product.category_id === '' ? null : product.category_id,
    }));

    const { data: rpcResponse, error: rpcError } = await supabaseClient.rpc("process_stock_audit", {
      p_audit_id: values.audit_id,
      p_auditor_id: currentManagerId,
      p_manager_notes: values.manager_notes || null,
      p_audited_products_details: cleanedAuditedProducts,
      p_status: values.status,
      p_auditor_branch_id: currentUserBranchId,
    });

    if (rpcError) {
      console.error("System RPC Error:", rpcError);
      toast.error(`A system error occurred: ${rpcError.message}`, {
        description: "Please check the browser console and Supabase logs for details.",
      });
    } else if (rpcResponse && rpcResponse.status === 'error') {
      console.error("Functional DB Error:", rpcResponse.message);
      toast.error("The audit process failed in the database.", {
        description: rpcResponse.message,
      });
    } else {
      toast.success(`Stock audit has been successfully ${values.status}!`);
      onAuditProcessed();
    }
    setIsLoading(false);
  };

  const onInvalid = (errors: FieldErrors<ManagerAuditFormValues>) => {
    console.error("❌ Form validation failed. The onSubmit function was not called. Errors:", errors);
    const errorMessage = errors.audited_products?.message || "Please check the form for errors and try again.";
    toast.error("Validation Failed", {
      description: errorMessage,
    });
  };

  const isApprovedStatus = form.watch("status") === "approved";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Stock Submission</DialogTitle>
          <DialogDescription>
            Review and approve/reject stock submitted by the controller.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>Submission Date:</strong> {formatDateDisplay(auditToProcess?.submission_date || null)}</p>
            <p><strong>Warehouse:</strong> {auditToProcess?.warehouses?.name || "N/A"}</p>
            <p><strong>Recorded By:</strong> {auditToProcess?.recorded_by_controller_user?.email || "N/A"}</p>
            <p><strong>Controller Notes:</strong> {auditToProcess?.notes_from_controller || "N/A"}</p>
          </div>

          <Separator className="my-2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Audit Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approve</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.status && (<p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>)}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="manager_notes">Manager Notes (Optional)</Label>
              <Textarea
                id="manager_notes"
                placeholder="Add notes for approval or reason for rejection."
                {...form.register("manager_notes")}
                disabled={isLoading}
              />
            </div>
          </div>

          <Separator className="my-2" />

          <h3 className="text-lg font-semibold">Products for Audit</h3>

          {form.formState.errors.audited_products?.message && (
            <p className="text-sm font-medium text-destructive bg-red-100 p-3 rounded-md">
              {form.formState.errors.audited_products.message}
            </p>
          )}

          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
            {fields.length > 0 ? (
              fields.map((field, index) => (
                <Card key={field.id ?? index}>
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="col-span-full lg:col-span-2 grid gap-2">
                      <Label>Product Details</Label>
                      <Input disabled value={`${field.product_name} (${field.product_ref})`} />
                      <p className="text-xs text-muted-foreground">Qty: {field.quantity} {field.product_unit_abbreviation || "N/A"}</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`audited_products.${index}.purchase_price`}>Purchase Price</Label>
                      <Controller
                        control={form.control}
                        name={`audited_products.${index}.purchase_price`}
                        render={({ field: controllerField }) => (
                          <Input
                            type="number" step="0.01" min={0} placeholder="0.00"
                            required={isApprovedStatus} {...controllerField}
                            value={controllerField.value ?? ""}
                            onChange={(e) => controllerField.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            disabled={isLoading || !isApprovedStatus}
                          />
                        )}
                      />
                      {form.formState.errors.audited_products?.[index]?.purchase_price && (<p className="text-red-500 text-sm mt-1">{form.formState.errors.audited_products[index]?.purchase_price?.message}</p>)}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`audited_products.${index}.sale_price`}>Sale Price</Label>
                      <Controller
                        control={form.control}
                        name={`audited_products.${index}.sale_price`}
                        render={({ field: controllerField }) => (
                          <Input
                            type="number" step="0.01" min={0} placeholder="0.00"
                            required={isApprovedStatus} {...controllerField}
                            value={controllerField.value ?? ""}
                            onChange={(e) => controllerField.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            disabled={isLoading || !isApprovedStatus}
                          />
                        )}
                      />
                      {form.formState.errors.audited_products?.[index]?.sale_price && (<p className="text-red-500 text-sm mt-1">{form.formState.errors.audited_products[index]?.sale_price?.message}</p>)}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No products in this submission.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>) : isApprovedStatus ? ("Approve Audit") : ("Reject Audit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog> 
  );
}