"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Define Zod schema for branch form validation
const branchFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Branch name must be at least 2 characters." }),
  location: z.string().optional(),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

interface BranchManagementActionsProps {
  branchToEdit?: {
    id: string;
    name: string;
    location: string | null;
    created_at: string;
    updated_at: string;
  };
  onBranchChanged?: () => void; // Callback for parent to refresh branch list
}

export default function BranchManagementActions({ branchToEdit, onBranchChanged }: BranchManagementActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: branchToEdit
      ? {
          id: branchToEdit.id,
          name: branchToEdit.name,
          location: branchToEdit.location || '',
        }
      : {
          name: "",
          location: "",
        },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(branchToEdit ? {
        id: branchToEdit.id,
        name: branchToEdit.name,
        location: branchToEdit.location || '',
      } : {
        name: "",
        location: "",
      });
      form.clearErrors();
    }
  }, [isDialogOpen, branchToEdit, form]);

  const onSubmit = async (values: BranchFormValues) => {
    setIsLoading(true);
    let error = null;
    const payload = {
      name: values.name,
      location: values.location || null,
    };

    if (branchToEdit) {
      const { error: dbUpdateError } = await supabaseClient
        .from('branches')
        .update(payload)
        .eq('id', branchToEdit.id);
      error = dbUpdateError;
      if (error) {
        toast.error("Failed to update branch.", { description: error.message });
      } else {
        toast.success("Branch updated successfully!");
        setIsDialogOpen(false);
        if (onBranchChanged) onBranchChanged();
      }
    } else {
      const { error: dbInsertError } = await supabaseClient
        .from('branches')
        .insert(payload);
      error = dbInsertError;
      if (error) {
        toast.error("Failed to add new branch.", { description: error.message });
      } else {
        toast.success("New branch added successfully!");
        setIsDialogOpen(false);
        if (onBranchChanged) onBranchChanged();
      }
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!branchToEdit?.id) return;

    const { error: dbDeleteError } = await supabaseClient
      .from('branches')
      .delete()
      .eq('id', branchToEdit.id);

    if (dbDeleteError) {
      toast.error("Failed to delete branch.", { description: dbDeleteError.message });
    } else {
      toast.success("Branch deleted successfully!");
      setIsConfirmDeleteOpen(false);
      if (onBranchChanged) onBranchChanged();
    }
    setIsLoading(false);
  };

  const isNewBranch = !branchToEdit;

  return (
    <>
      {!branchToEdit && (
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Branch
        </Button>
      )}

      {branchToEdit && (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} title="Edit Branch">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setIsConfirmDeleteOpen(true)} title="Delete Branch">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isNewBranch ? "Add New Branch" : `Edit Branch: ${branchToEdit?.name}`}</DialogTitle>
            <DialogDescription>
              {isNewBranch ? "Enter details for the new branch." : "Make changes to the branch details here."}
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
                placeholder="Main Store"
                className="col-span-3"
                {...form.register("name")}
                disabled={isLoading}
              />
              {form.formState.errors.name && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                type="text"
                placeholder="123 Example St, City"
                className="col-span-3"
                {...form.register("location")}
                disabled={isLoading}
              />
              {form.formState.errors.location && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.location.message}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isNewBranch ? "Adding Branch..." : "Saving Changes...") : (isNewBranch ? "Add Branch" : "Save Changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete branch &quot;{branchToEdit?.name}&quot;? This action cannot be undone.
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
    </>
  ); 
}