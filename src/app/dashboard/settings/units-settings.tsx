// src/app/dashboard/settings/units-settings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define Zod schema for unit form validation
const unitFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Unit name is required." }),
  abbreviation: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface UnitsSettingsProps {
  initialData: Array<{
    id: string;
    name: string;
    abbreviation: string | null;
  }>;
}

export default function UnitsSettings({ initialData }: UnitsSettingsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<typeof initialData[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { name: "", abbreviation: "" },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(unitToEdit ? {
        id: unitToEdit.id,
        name: unitToEdit.name,
        abbreviation: unitToEdit.abbreviation || '',
      } : {
        name: "",
        abbreviation: "",
      });
      form.clearErrors();
    }
  }, [isDialogOpen, unitToEdit, form]);

  const onSubmit = async (values: UnitFormValues) => {
    setIsLoading(true);
    let error = null;
    const payload = {
      name: values.name,
      abbreviation: values.abbreviation || null,
    };

    if (unitToEdit) {
      const { error: dbUpdateError } = await supabaseClient
        .from('units')
        .update(payload)
        .eq('id', unitToEdit.id);
      error = dbUpdateError;

      if (error) {
        toast.error("Failed to update unit.", { description: error.message });
      } else {
        toast.success("Unit updated successfully!");
        setIsDialogOpen(false);
        router.refresh();
      }
    } else {
      const { error: dbInsertError } = await supabaseClient
        .from('units')
        .insert(payload);
      error = dbInsertError;

      if (error) {
        toast.error("Failed to add new unit.", { description: error.message });
      } else {
        toast.success("New unit added successfully!");
        setIsDialogOpen(false);
        router.refresh();
      }
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!unitToEdit?.id) return;

    const { error: dbDeleteError } = await supabaseClient
      .from('units')
      .delete()
      .eq('id', unitToEdit.id);

    if (dbDeleteError) {
      toast.error("Failed to delete unit.", { description: dbDeleteError.message });
    } else {
      toast.success("Unit deleted successfully!");
      setIsConfirmDeleteOpen(false);
      router.refresh();
    }
    setIsLoading(false);
  };

  const openEditDialog = (unit: typeof initialData[0]) => {
    setUnitToEdit(unit);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setUnitToEdit(null);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (unit: typeof initialData[0]) => {
    setUnitToEdit(unit);
    setIsConfirmDeleteOpen(true);
  };

  const isNewUnit = !unitToEdit;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Unit
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Units</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Abbreviation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData && initialData.length > 0 ? (
              initialData.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>{unit.abbreviation || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(unit)} title="Edit Unit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(unit)} title="Delete Unit">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No units defined.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Unit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isNewUnit ? "Add New Unit" : `Edit Unit: ${unitToEdit?.name}`}</DialogTitle>
            <DialogDescription>
              {isNewUnit ? "Enter details for the new unit." : "Make changes to the unit details here."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Kilogram"
                className="col-span-3"
                {...form.register("name")}
                disabled={isLoading}
              />
              {form.formState.errors.name && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="abbreviation" className="text-right">
                Abbreviation
              </Label>
              <Input
                id="abbreviation"
                type="text"
                placeholder="kg"
                className="col-span-3"
                {...form.register("abbreviation")}
                disabled={isLoading}
              />
              {form.formState.errors.abbreviation && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.abbreviation.message}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isNewUnit ? "Adding Unit..." : "Saving Changes...") : (isNewUnit ? "Add Unit" : "Save Changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete unit &quot;{unitToEdit?.name}&quot;? This action cannot be undone. {/* Escaped quote */}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}