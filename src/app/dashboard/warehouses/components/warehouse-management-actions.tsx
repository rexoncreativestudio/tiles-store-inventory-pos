// src/app/dashboard/warehouses/components/warehouse-management-actions.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// --- Type Definitions (aligned with page.tsx: NO branch_id on WarehouseRecord) ---
type WarehouseRecord = {
  id: string;
  name: string;
  location: string | null;
};

// Zod schema for warehouse form validation
const warehouseFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Warehouse name is required." }),
  location: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

interface WarehouseManagementActionsProps {
  warehouseToEdit?: WarehouseRecord;
  onWarehouseSubmitted: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function WarehouseManagementActions({
  warehouseToEdit,
  onWarehouseSubmitted,
  isOpen = false,
  onClose = () => {},
}: WarehouseManagementActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: warehouseToEdit
      ? {
          id: warehouseToEdit.id,
          name: warehouseToEdit.name,
          location: warehouseToEdit.location || '',
        }
      : {
          name: '',
          location: '',
        },
  });

  // Reset form when isOpen prop changes (triggered by parent) or when warehouseToEdit changes
  useEffect(() => {
    if (isOpen) {
      form.reset(warehouseToEdit ? {
        id: warehouseToEdit.id,
        name: warehouseToEdit.name,
        location: warehouseToEdit.location || '',
      } : {
        name: '',
        location: '',
      });
      form.clearErrors();
    }
  }, [isOpen, warehouseToEdit, form]);

  const onSubmit: SubmitHandler<WarehouseFormValues> = async (values) => {
    setIsLoading(true);
    let error = null;

    const payload = {
      name: values.name,
      location: values.location || null,
    };

    if (warehouseToEdit) {
      const { error: dbUpdateError } = await supabaseClient
        .from('warehouses')
        .update(payload)
        .eq('id', warehouseToEdit.id);
      error = dbUpdateError;
    } else {
      const { error: dbInsertError } = await supabaseClient
        .from('warehouses')
        .insert(payload);
      error = dbInsertError;
    }

    if (error) {
      toast.error(`Failed to ${warehouseToEdit ? 'update' : 'add'} warehouse.`, { description: error.message });
    } else {
      toast.success(`Warehouse ${warehouseToEdit ? 'updated' : 'added'} successfully!`);
      onClose();
      onWarehouseSubmitted();
    }
    setIsLoading(false);
  };

  const isNewWarehouse = !warehouseToEdit;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isNewWarehouse ? "Add New Warehouse" : `Edit Warehouse: ${warehouseToEdit?.name}`}</DialogTitle>
            <DialogDescription>
              {isNewWarehouse ? "Enter details for the new warehouse." : "Make changes to the warehouse details here."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Main Warehouse"
                {...form.register("name")}
                disabled={isLoading}
              />
              {form.formState.errors.name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                type="text"
                placeholder="City, Street"
                {...form.register("location")}
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}