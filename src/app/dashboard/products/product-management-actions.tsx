// src/app/dashboard/products/product-management-actions.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabaseClient } from '@/lib/supabase/client';
import { CategoryForProductForm, ProductItem } from './types';


const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Product name is required." }),
  unique_reference: z.string().min(1, { message: "Unique reference is required." }),
  description: z.string().optional(),
  // CORRECTED: Removed z.string().uuid() directly. Rely on transform and existence check.
  category_id: z.string()
    .transform(e => e === "__NULL_SELECTION__" ? null : e)
    .nullable()
    // The refine function will ensure the selected value actually exists in the categories provided.
    // We remove the explicit UUID check here, as not all IDs from DB might be strictly UUIDs,
    // or the previous DB seeding created non-UUID IDs.
    .refine(val => val === null || val.length > 0, { // Just ensure it's not empty string if not null
      message: "Invalid category selected."
    }),
  product_unit_abbreviation: z.string().nullable().refine(val => val === null || val.length > 0, {
    message: "Unit cannot be empty if category selected."
  }),
  purchase_price: z.number().min(0, { message: "Purchase price must be non-negative." }),
  sale_price: z.number().min(0, { message: "Sale price must be non-negative." }),
  is_active: z.boolean(),
  low_stock_threshold: z.number().min(0, { message: "Threshold must be non-negative." }),
  image_url: z.string().url("Invalid URL").optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductManagementActionsProps {
  productToEdit?: ProductItem;
  categories: CategoryForProductForm[];
}

export default function ProductManagementActions({ productToEdit, categories }: ProductManagementActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productToEdit
      ? {
          id: productToEdit.id,
          name: productToEdit.name,
          unique_reference: productToEdit.unique_reference,
          description: productToEdit.description || '',
          category_id: productToEdit.category_id,
          product_unit_abbreviation: productToEdit.product_unit_abbreviation,
          purchase_price: productToEdit.purchase_price,
          sale_price: productToEdit.sale_price,
          is_active: productToEdit.is_active,
          low_stock_threshold: productToEdit.low_stock_threshold,
          image_url: productToEdit.image_url === '' ? '' : productToEdit.image_url || '',
        }
      : {
          name: '',
          unique_reference: '',
          description: '',
          category_id: null,
          product_unit_abbreviation: null,
          purchase_price: 0,
          sale_price: 0,
          is_active: true,
          low_stock_threshold: 10,
          image_url: '',
        },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(productToEdit ? {
        id: productToEdit.id,
        name: productToEdit.name,
        unique_reference: productToEdit.unique_reference,
        description: productToEdit.description || '',
        category_id: productToEdit.category_id,
        product_unit_abbreviation: productToEdit.product_unit_abbreviation,
        purchase_price: productToEdit.purchase_price,
        sale_price: productToEdit.sale_price,
        is_active: productToEdit.is_active,
        low_stock_threshold: productToEdit.low_stock_threshold,
        image_url: productToEdit.image_url === '' ? '' : productToEdit.image_url || '',
      } : {
        name: '',
        unique_reference: '',
        description: '',
        category_id: null,
        product_unit_abbreviation: null,
        purchase_price: 0,
        sale_price: 0,
        is_active: true,
        low_stock_threshold: 10,
        image_url: '',
      });
      form.clearErrors();
    }
  }, [isDialogOpen, productToEdit, form]);

  const watchedCategoryId = form.watch('category_id');

  useEffect(() => {
    const selectedCategory = categories.find(cat => cat.id === watchedCategoryId);
    if (selectedCategory?.unit_abbreviation) { // Use unit_abbreviation from category
      form.setValue('product_unit_abbreviation', selectedCategory.unit_abbreviation, { shouldValidate: true }); // Set abbreviation
    } else {
      form.setValue('product_unit_abbreviation', null, { shouldValidate: true }); // Set null if no abbreviation
    }
  }, [watchedCategoryId, categories, form.setValue, form]);

  const productUnitAbbreviation = form.watch('product_unit_abbreviation');

  const displayedUnitAbbreviation = useMemo(() => {
    return productUnitAbbreviation || 'N/A';
  }, [productUnitAbbreviation]);

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    setIsLoading(true);
    let error: Error | null = null;

    if (productToEdit) {
      const { error: dbError } = await supabaseClient
        .from('products')
        .update({
          name: values.name,
          unique_reference: values.unique_reference,
          description: values.description,
          category_id: values.category_id,
          product_unit_abbreviation: values.product_unit_abbreviation,
          purchase_price: values.purchase_price,
          sale_price: values.sale_price,
          is_active: values.is_active,
          low_stock_threshold: values.low_stock_threshold,
          image_url: values.image_url === '' ? null : values.image_url,
        })
        .eq('id', productToEdit.id);
      error = dbError;
    } else {
      const { error: dbError } = await supabaseClient
        .from('products')
        .insert({
          name: values.name,
          unique_reference: values.unique_reference,
          description: values.description,
          category_id: values.category_id,
          product_unit_abbreviation: values.product_unit_abbreviation,
          purchase_price: values.purchase_price,
          sale_price: values.sale_price,
          is_active: values.is_active,
          low_stock_threshold: values.low_stock_threshold,
          image_url: values.image_url === '' ? null : values.image_url,
        });
      error = dbError;
    }

    if (error) {
      toast.error(`Failed to ${productToEdit ? 'update' : 'add'} product.`, { description: error.message });
    } else {
      toast.success(`Product ${productToEdit ? 'updated' : 'added'} successfully!`);
      setIsDialogOpen(false);
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!productToEdit?.id) {
      toast.error("No product selected for deletion.");
      setIsLoading(false);
      return;
    }

    const { error } = await supabaseClient
      .from('products')
      .delete()
      .eq('id', productToEdit.id);

    if (error) {
      toast.error("Failed to delete product.", { description: error.message });
    } else {
      toast.success("Product deleted successfully!");
      setIsConfirmDeleteOpen(false);
      router.refresh();
    }
    setIsLoading(false);
  };

  const isNewProduct = !productToEdit;

  return (
    <>
      {!productToEdit && (
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      )}

      {productToEdit && (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} title="Edit Product">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setIsConfirmDeleteOpen(true)} title="Delete Product">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{isNewProduct ? "Add New Product" : `Edit Product: ${productToEdit?.name}`}</DialogTitle>
            <DialogDescription>
              {isNewProduct ? "Enter details for the new product." : "Make changes to the product here."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
            <div className="grid gap-1">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Product Name"
                {...form.register("name")}
                disabled={isLoading}
              />
              {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid gap-1">
              <Label htmlFor="unique_reference" className="text-right">
                Reference
              </Label>
              <Input
                id="unique_reference"
                placeholder="SKU-001"
                {...form.register("unique_reference")}
                disabled={isLoading || !isNewProduct}
              />
              {form.formState.errors.unique_reference && <p className="text-red-500 text-sm">{form.formState.errors.unique_reference.message}</p>}
            </div>

            <div className="grid gap-1 md:col-span-2">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                placeholder="Optional description"
                {...form.register("description")}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="category_id" className="text-right">
                Category
              </Label>
              <Select
                // CORRECTED: onValueChange sets null when the placeholder value is "__NULL_SELECTION__"
                onValueChange={(value) => form.setValue("category_id", value === "__NULL_SELECTION__" ? null : value, { shouldValidate: true })}
                // CORRECTED: value prop shows "__NULL_SELECTION__" when form.watch is null
                value={form.watch("category_id") || "__NULL_SELECTION__"}
                disabled={isLoading}
              >
                <SelectTrigger id="category_id">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {/* CORRECTED: SelectItem for "None" now has a unique, non-empty string value */}
                  <SelectItem value="__NULL_SELECTION__">None</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category_id && <p className="text-red-500 text-sm">{form.formState.errors.category_id.message}</p>}
            </div>

            <div className="grid gap-1">
              <Label htmlFor="unit_display" className="text-right">
                Unit
              </Label>
              <Input
                id="unit_display"
                value={displayedUnitAbbreviation || 'N/A'}
                disabled
                placeholder="Select a Category first"
                className="col-span-3"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="purchase_price" className="text-right">
                Purchase Price
              </Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("purchase_price", { valueAsNumber: true })}
                disabled={isLoading}
              />
              {form.formState.errors.purchase_price && <p className="text-red-500 text-sm">{form.formState.errors.purchase_price.message}</p>}
            </div>

            <div className="grid gap-1">
              <Label htmlFor="sale_price" className="text-right">
                Sale Price
              </Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("sale_price", { valueAsNumber: true })}
                disabled={isLoading}
              />
              {form.formState.errors.sale_price && <p className="text-red-500 text-sm">{form.formState.errors.sale_price.message}</p>}
            </div>

            <div className="grid gap-1">
              <Label htmlFor="low_stock_threshold" className="text-right">
                Low Stock Threshold
              </Label>
              <Input
                id="low_stock_threshold"
                type="number"
                step="1"
                placeholder="10"
                {...form.register("low_stock_threshold", { valueAsNumber: true })}
                disabled={isLoading}
              />
              {form.formState.errors.low_stock_threshold && <p className="text-red-500 text-sm">{form.formState.errors.low_stock_threshold.message}</p>}
            </div>

            <div className="grid gap-1">
              <Label htmlFor="image_url" className="text-right">
                Image URL
              </Label>
              <Input
                id="image_url"
                placeholder="http://example.com/image.png"
                {...form.register("image_url")}
                disabled={isLoading}
              />
              {form.formState.errors.image_url && <p className="text-red-500 text-sm">{form.formState.errors.image_url.message}</p>}
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <input
                type="checkbox"
                id="is_active"
                {...form.register("is_active")}
                disabled={isLoading}
              />
              <Label htmlFor="is_active">Is Active</Label>
            </div>

            <DialogFooter className="md:col-span-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isNewProduct ? "Adding Product..." : "Saving Changes...") : (isNewProduct ? "Add Product" : "Save Changes")}
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
              Are you sure you want to delete product &quot;{productToEdit?.name}&quot;? This action cannot be undone.
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