"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabaseClient } from '@/lib/supabase/client';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import {
  useForm,
  SubmitHandler,
  useFieldArray,
  Controller
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import {
  WarehouseForController,
  ControllerStockSubmissionFormValues,
  controllerStockSubmissionFormSchema,
  ProductCategory,
  PendingAuditRecord, // Import PendingAuditRecord
} from '../types';

interface ControllerSubmissionFormProps {
  warehouses: WarehouseForController[];
  allCategories: ProductCategory[];
  recordedByUserId: string;
  // Use the precise PendingAuditRecord type for type safety
  initialSubmission?: PendingAuditRecord | null;
  isOpen?: boolean;
  onClose?: () => void;
  onSubmissionSuccess?: () => void;
}

// Helper to format date for datetime-local input
function toDatetimeLocal(date: Date): string {
  return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
}

export default function ControllerSubmissionForm({
  warehouses,
  allCategories,
  recordedByUserId,
  initialSubmission,
  isOpen = false,
  onClose = () => {},
  onSubmissionSuccess = () => {},
}: ControllerSubmissionFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ControllerStockSubmissionFormValues>({
    resolver: zodResolver(controllerStockSubmissionFormSchema),
    defaultValues: {
      submission_id: undefined,
      warehouse_id: '',
      submission_date: toDatetimeLocal(new Date()),
      products_submitted: [{
        tempId: crypto.randomUUID(),
        product_name: '',
        product_ref: '',
        quantity: 1,
        category_id: '',
        product_unit_abbreviation: '',
      }],
      notes_from_controller: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products_submitted",
  });

  const sortedCategories = useMemo(() => {
    return [
      ...allCategories.filter(cat => cat.name?.toLowerCase().startsWith("tiles")),
      ...allCategories.filter(cat => !cat.name?.toLowerCase().startsWith("tiles")),
    ];
  }, [allCategories]);

  useEffect(() => {
    if (isOpen) {
      if (initialSubmission) {
        // If editing, populate form with initialSubmission data
        form.reset({
          submission_id: initialSubmission.id,
          warehouse_id: initialSubmission.warehouse_id,
          submission_date: toDatetimeLocal(new Date(initialSubmission.submission_date)),
          products_submitted: initialSubmission.submission_details.map((p) => ({
            tempId: crypto.randomUUID(),
            product_name: p.product_name,
            product_ref: p.product_ref,
            quantity: p.quantity,
            category_id: p.category_id || '',
            product_unit_abbreviation: p.product_unit_abbreviation || '',
          })),
          notes_from_controller: initialSubmission.notes_from_controller || '',
        });
      } else {
        // If creating new, reset to default values
        form.reset({
          submission_id: undefined,
          warehouse_id: '',
          submission_date: toDatetimeLocal(new Date()),
          products_submitted: [{ tempId: crypto.randomUUID(), product_name: '', product_ref: '', quantity: 1, category_id: '', product_unit_abbreviation: '' }],
          notes_from_controller: '',
        });
      }
      form.clearErrors();
    }
  }, [isOpen, initialSubmission, form]);

  const isEditing = !!initialSubmission?.id;

  const onSubmit: SubmitHandler<ControllerStockSubmissionFormValues> = async (values) => {
    setIsLoading(true);
    
    const productsSubmittedPayload = values.products_submitted.map((p) => {
      const selectedCategory = allCategories.find(cat => cat.id === p.category_id);
      return {
        product_name: p.product_name,
        product_ref: p.product_ref,
        quantity: p.quantity,
        category_id: p.category_id,
        product_unit_abbreviation: selectedCategory?.unit_abbreviation || null,
      };
    });

    const payload = {
      submission_date: new Date(values.submission_date).toISOString(),
      warehouse_id: values.warehouse_id,
      recorded_by_controller_id: recordedByUserId,
      status: 'pending_audit',
      notes_from_controller: values.notes_from_controller || null,
      submission_details: productsSubmittedPayload,
    };

    const { error } = isEditing
      ? await supabaseClient.from('pending_stock_audits').update(payload).eq('id', initialSubmission!.id)
      : await supabaseClient.from('pending_stock_audits').insert(payload);

    if (error) {
      toast.error(`Failed to ${isEditing ? 'update' : 'submit'} stock audit.`, { description: error.message });
    } else {
      toast.success(`Stock audit ${isEditing ? 'updated' : 'submitted'} successfully!`);
      onSubmissionSuccess();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit Stock Audit` : "Submit New Stock Audit"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify the details of this pending audit." : "Enter details for a new stock count submission."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-6 pl-2 space-y-4">
          {/* Form content remains the same... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="submission_date">Submission Date</Label>
              <Input id="submission_date" type="datetime-local" {...form.register("submission_date")} disabled={isLoading} />
              {form.formState.errors.submission_date && <p className="text-red-500 text-sm">{form.formState.errors.submission_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse_id">Warehouse</Label>
              <Controller
                control={form.control}
                name="warehouse_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || isEditing}>
                    <SelectTrigger id="warehouse_id"><SelectValue placeholder="Select a warehouse" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.map(wh => <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.warehouse_id && <p className="text-red-500 text-sm">{form.formState.errors.warehouse_id.message}</p>}
            </div>
          </div>

          <Separator />

          <h3 className="text-lg font-semibold">Products in this Audit</h3>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
                  <div className="space-y-2 lg:col-span-2">
                    <Label>Product Name</Label>
                    <Input {...form.register(`products_submitted.${index}.product_name`)} disabled={isLoading} />
                    {form.formState.errors.products_submitted?.[index]?.product_name && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].product_name?.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Product Ref</Label>
                    <Input {...form.register(`products_submitted.${index}.product_ref`)} disabled={isLoading} />
                     {form.formState.errors.products_submitted?.[index]?.product_ref && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].product_ref?.message}</p>}
                  </div>
                   <div className="space-y-2">
                    <Label>Category</Label>
                    <Controller
                      control={form.control}
                      name={`products_submitted.${index}.category_id`}
                      render={({ field: controllerField }) => (
                        <Select onValueChange={controllerField.onChange} value={controllerField.value} disabled={isLoading}>
                          <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                          <SelectContent>
                            {sortedCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                     {form.formState.errors.products_submitted?.[index]?.category_id && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].category_id?.message}</p>}
                  </div>
                  <div className="space-y-2">
                     <Label>Quantity</Label>
                     <Input type="number" min="1" {...form.register(`products_submitted.${index}.quantity`, { valueAsNumber: true })} disabled={isLoading} />
                      {form.formState.errors.products_submitted?.[index]?.quantity && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].quantity?.message}</p>}
                  </div>
                   <div className="lg:col-span-full flex justify-end items-center mt-2">
                      {fields.length > 1 && (
                          <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} disabled={isLoading}>
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                          </Button>
                      )}
                  </div>
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={() => append({ tempId: crypto.randomUUID(), product_name: '', product_ref: '', quantity: 1, category_id: '', product_unit_abbreviation: '' })} disabled={isLoading}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Another Product
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes_from_controller">Notes (Optional)</Label>
            <Textarea id="notes_from_controller" placeholder="Any specific observations..." {...form.register("notes_from_controller")} disabled={isLoading} />
          </div>
        </form>
        <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditing ? "Update Submission" : "Submit Audit")}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
