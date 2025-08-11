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
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase/client";
import { Loader2, Trash2 } from "lucide-react";
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
      audited_products: [],
    },
  });

  // Add remove functionality to audited_products
  const { fields, remove } = useFieldArray<ManagerAuditFormValues, "audited_products">({
    control: form.control,
    name: "audited_products",
  });

  // Track if there are unsaved changes by comparing form fields to auditToProcess.submission_details
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen && auditToProcess) {
      // Reset form every time modal opens to original audit data
      form.reset({
        audit_id: auditToProcess.id,
        status: auditToProcess.status === "rejected" ? "rejected" : "approved",
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
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, auditToProcess]);

  // Detect unsaved changes for warning prompt
  useEffect(() => {
    if (!auditToProcess) {
      setIsDirty(false);
      return;
    }
    const currentProducts = form.watch("audited_products");
    const initialProducts = auditToProcess.submission_details.map((item) => ({
      product_name: item.product_name,
      product_ref: item.product_ref,
      quantity: item.quantity,
      product_unit_abbreviation: item.product_unit_abbreviation || null,
      category_id: item.category_id || null,
      purchase_price: item.purchase_price ?? null,
      sale_price: item.sale_price ?? null,
    }));
    // Simple dirty check: number of products or any field differs
    if (
      currentProducts.length !== initialProducts.length ||
      currentProducts.some((prod, idx) => {
        const initial = initialProducts[idx];
        return (
          prod.product_name !== initial.product_name ||
          prod.product_ref !== initial.product_ref ||
          prod.quantity !== initial.quantity ||
          prod.product_unit_abbreviation !== initial.product_unit_abbreviation ||
          prod.category_id !== initial.category_id ||
          prod.purchase_price !== initial.purchase_price ||
          prod.sale_price !== initial.sale_price
        );
      })
    ) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("audited_products"), form.watch("status")]);

  const handleClose = () => {
    if (isDirty) {
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to close? All edits will be lost."
        )
      ) {
        return;
      }
    }
    onClose();
  };

  const onSubmit: SubmitHandler<ManagerAuditFormValues> = async (values) => {
    setIsLoading(true);

    const cleanedAuditedProducts = values.audited_products.map(product => ({
      ...product,
      category_id: product.category_id === '' ? null : product.category_id,
    }));

    // Prevent submit if no products left
    if (cleanedAuditedProducts.length === 0) {
      toast.error("Cannot submit: At least one product is required.");
      setIsLoading(false);
      return;
    }

    const { data: rpcResponse, error: rpcError } = await supabaseClient.rpc("process_stock_audit", {
      p_audit_id: values.audit_id,
      p_auditor_id: currentManagerId,
      p_manager_notes: null, // Always null as notes field is removed
      p_audited_products_details: cleanedAuditedProducts,
      p_status: values.status,
      p_auditor_branch_id: currentUserBranchId,
    });

    if (rpcError) {
      toast.error(`A system error occurred: ${rpcError.message}`, {
        description: "Please check the browser console and Supabase logs for details.",
      });
    } else if (rpcResponse && rpcResponse.status === 'error') {
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
    const errorMessage = errors.audited_products?.message || "Please check the form for errors and try again.";
    toast.error("Validation Failed", {
      description: errorMessage,
    });
  };

  const isApprovedStatus = form.watch("status") === "approved";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold text-center">Audit Stock Submission</DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Review and approve/reject stock submitted by the controller.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid gap-6">
          {/* Submission Details Section */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Submission Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p>
                <strong>Submission Date:</strong>{" "}
                <span className="text-gray-700">{formatDateDisplay(auditToProcess?.submission_date || null)}</span>
              </p>
              <p>
                <strong>Warehouse:</strong>{" "}
                <span className="text-gray-700">{auditToProcess?.warehouses?.name || "N/A"}</span>
              </p>
              <p>
                <strong>Recorded By:</strong>{" "}
                <span className="text-gray-700">{auditToProcess?.recorded_by_controller_user?.email || "N/A"}</span>
              </p>
              <p>
                <strong>Controller Notes:</strong>{" "}
                <span className="text-gray-700">{auditToProcess?.notes_from_controller || "N/A"}</span>
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Audit Status Section */}
          <div className="grid gap-2">
            <Label htmlFor="status" className="text-base font-semibold text-gray-800">Audit Status</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <SelectTrigger id="status" className="w-full md:w-1/2 lg:w-1/3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.status && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>

          <Separator className="my-4" />

          {/* Products for Audit Section */}
          <h3 className="text-xl font-bold text-gray-800">Products for Audit</h3>

          {form.formState.errors.audited_products?.message && (
            <p className="text-sm font-medium text-destructive bg-red-100 p-3 rounded-md border border-red-200">
              {form.formState.errors.audited_products.message}
            </p>
          )}

          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
            {fields.length > 0 ? (
              fields.map((field, index) => (
                <Card key={field.id ?? index} className="border border-gray-200 shadow-sm rounded-lg relative">
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                    {/* Product Name (editable) */}
                    <div className="col-span-full lg:col-span-2 grid gap-1">
                      <Label htmlFor={`audited_products.${index}.product_name`} className="text-sm font-medium text-gray-700">Product Name</Label>
                      <Controller
                        control={form.control}
                        name={`audited_products.${index}.product_name`}
                        render={({ field: controllerField }) => (
                          <Input
                            {...controllerField}
                            value={controllerField.value ?? ""}
                            onChange={(e) => controllerField.onChange(e.target.value)}
                            disabled={isLoading || !isApprovedStatus}
                            className="font-semibold text-base"
                          />
                        )}
                      />
                      {form.formState.errors.audited_products?.[index]?.product_name && (
                        <p className="text-red-500 text-xs mt-1">
                          {form.formState.errors.audited_products[index]?.product_name?.message}
                        </p>
                      )}
                    </div>

                    {/* Product Reference (editable) */}
                    <div className="grid gap-2">
                      <Label htmlFor={`audited_products.${index}.product_ref`} className="text-sm font-medium text-gray-700">Product Ref</Label>
                      <Controller
                        control={form.control}
                        name={`audited_products.${index}.product_ref`}
                        render={({ field: controllerField }) => (
                          <Input
                            {...controllerField}
                            value={controllerField.value ?? ""}
                            onChange={(e) => controllerField.onChange(e.target.value)}
                            disabled={isLoading || !isApprovedStatus}
                            className="text-base"
                          />
                        )}
                      />
                      {form.formState.errors.audited_products?.[index]?.product_ref && (
                        <p className="text-red-500 text-xs mt-1">
                          {form.formState.errors.audited_products[index]?.product_ref?.message}
                        </p>
                      )}
                    </div>

                    {/* Quantity (editable) */}
                    <div className="grid gap-2">
                      <Label htmlFor={`audited_products.${index}.quantity`} className="text-sm font-medium text-gray-700">Quantity</Label>
                      <Controller
                        control={form.control}
                        name={`audited_products.${index}.quantity`}
                        render={({ field: controllerField }) => (
                          <Input
                            type="number" step="any" min={0}
                            {...controllerField}
                            value={controllerField.value ?? ""}
                            onChange={(e) => controllerField.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            disabled={isLoading || !isApprovedStatus}
                            className="text-base"
                          />
                        )}
                      />
                      {form.formState.errors.audited_products?.[index]?.quantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {form.formState.errors.audited_products[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    {/* Purchase Price (existing editable) */}
                    <div className="grid gap-2 col-span-full sm:col-span-1 lg:col-span-2">
                      <Label htmlFor={`audited_products.${index}.purchase_price`} className="text-sm font-medium text-gray-700">Purchase Price</Label>
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
                            className="text-base"
                          />
                        )}
                      />
                      {form.formState.errors.audited_products?.[index]?.purchase_price && (
                        <p className="text-red-500 text-xs mt-1">
                          {form.formState.errors.audited_products[index]?.purchase_price?.message}
                        </p>
                      )}
                    </div>

                    {/* Sale Price (existing editable) */}
                    <div className="grid gap-2 col-span-full sm:col-span-1 lg:col-span-2">
                      <Label htmlFor={`audited_products.${index}.sale_price`} className="text-sm font-medium text-gray-700">Sale Price</Label>
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
                            className="text-base"
                          />
                        )}
                      />
                      {form.formState.errors.audited_products?.[index]?.sale_price && (
                        <p className="text-red-500 text-xs mt-1">
                          {form.formState.errors.audited_products[index]?.sale_price?.message}
                        </p>
                      )}
                    </div>

                    {/* Remove Button */}
                    {isApprovedStatus && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 z-10"
                        onClick={() => remove(index)}
                        disabled={isLoading}
                        title="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No products in this submission.</p>
            )}
          </div>

          <DialogFooter className="mt-6 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>) : isApprovedStatus ? ("Approve Audit") : ("Reject Audit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );   
}