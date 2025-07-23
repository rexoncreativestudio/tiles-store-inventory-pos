// src/app/dashboard/settings/categories-settings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // CORRECTED: Import Textarea component
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

// Define Zod schema for category form validation
const categoryFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Category name is required." }),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoriesSettingsProps {
  initialData: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export default function CategoriesSettings({ initialData }: CategoriesSettingsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<typeof initialData[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(categoryToEdit ? {
        id: categoryToEdit.id,
        name: categoryToEdit.name,
        description: categoryToEdit.description || '',
      } : {
        name: "",
        description: "",
      });
      form.clearErrors();
    }
  }, [isDialogOpen, categoryToEdit, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    setIsLoading(true);
    let error = null;
    const payload = {
      name: values.name,
      description: values.description || null,
    };

    if (categoryToEdit) {
      const { error: dbUpdateError } = await supabaseClient
        .from('categories')
        .update(payload)
        .eq('id', categoryToEdit.id);
      error = dbUpdateError;

      if (error) {
        toast.error("Failed to update category.", { description: error.message });
      } else {
        toast.success("Category updated successfully!");
        setIsDialogOpen(false);
        router.refresh();
      }
    } else {
      const { error: dbInsertError } = await supabaseClient
        .from('categories')
        .insert(payload);
      error = dbInsertError;

      if (error) {
        toast.error("Failed to add new category.", { description: error.message });
      } else {
        toast.success("New category added successfully!");
        setIsDialogOpen(false);
        router.refresh();
      }
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!categoryToEdit?.id) return;

    const { error: dbDeleteError } = await supabaseClient
      .from('categories')
      .delete()
      .eq('id', categoryToEdit.id);

    if (dbDeleteError) {
      toast.error("Failed to delete category.", { description: dbDeleteError.message });
    } else {
      toast.success("Category deleted successfully!");
      setIsConfirmDeleteOpen(false);
      router.refresh();
    }
    setIsLoading(false);
  };

  const openEditDialog = (category: typeof initialData[0]) => {
    setCategoryToEdit(category);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setCategoryToEdit(null);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (category: typeof initialData[0]) => {
    setCategoryToEdit(category);
    setIsConfirmDeleteOpen(true);
  };

  const isNewCategory = !categoryToEdit;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">Categories</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData && initialData.length > 0 ? (
              initialData.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(category)} title="Edit Category">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(category)} title="Delete Category">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No categories defined.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isNewCategory ? "Add New Category" : `Edit Category: ${categoryToEdit?.name}`}</DialogTitle>
            <DialogDescription>
              {isNewCategory ? "Enter details for the new category." : "Make changes to the category details here."}
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
                placeholder="Tiles"
                className="col-span-3"
                {...form.register("name")}
                disabled={isLoading}
              />
              {form.formState.errors.name && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea // Use Textarea component
                id="description"
                placeholder="e.g., Ceramic, Porcelain, etc."
                className="col-span-3"
                {...form.register("description")}
                disabled={isLoading}
              />
              {form.formState.errors.description && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.description.message}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isNewCategory ? "Adding Category..." : "Saving Changes...") : (isNewCategory ? "Add Category" : "Save Changes")}
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
              Are you sure you want to delete category &quot;{categoryToEdit?.name}&quot;? This action cannot be undone. {/* Escaped quote */}
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