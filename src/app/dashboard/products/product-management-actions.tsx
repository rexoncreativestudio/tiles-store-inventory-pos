"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabaseClient } from "@/lib/supabase/client";
import { CategoryForProductForm, ProductItem } from "./types";

// Tile dimensions suggestions
const TILE_DIMENSIONS_SUGGESTIONS = [
  "10cm x 10cm",
  "15cm x 15cm",
  "20cm x 20cm",
  "20cm x 30cm",
  "25cm x 25cm",
  "30cm x 30cm",
  "30cm x 60cm",
  "33cm x 33cm",
  "40cm x 40cm",
  "45cm x 45cm",
  "50cm x 50cm",
  "60cm x 60cm",
  "60cm x 120cm",
  "75cm x 75cm",
  "80cm x 80cm",
  "90cm x 90cm",
  "100cm x 100cm",
  "120cm x 120cm",
  "120cm x 240cm",
  "120cm x 270cm",
  "160cm x 320cm",
];

// Zod Schema: ensure nullable fields are handled as "" or undefined for form
const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Product name is required." }),
  unique_reference: z.string().min(1, { message: "Unique reference is required." }),
  description: z.string().optional(),
  category_id: z.string().optional(),
  product_unit_abbreviation: z.string().optional(),
  purchase_price: z.number().min(0, { message: "Purchase price must be non-negative." }),
  sale_price: z.number().min(0, { message: "Sale price must be non-negative." }),
  is_active: z.boolean(),
  low_stock_threshold: z.number().min(0, { message: "Low stock threshold must be non-negative." }),
  image_url: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductManagementActionsProps {
  productToEdit?: ProductItem;
  categories: CategoryForProductForm[];
  onProductSubmitted: () => void;
}

export default function ProductManagementActions({
  productToEdit,
  categories,
  onProductSubmitted,
}: ProductManagementActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Autocomplete state for name field
  const [nameInput, setNameInput] = useState("");
  const [isNameFocused, setIsNameFocused] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      unique_reference: "",
      description: "",
      category_id: "",
      product_unit_abbreviation: "",
      purchase_price: 0,
      sale_price: 0,
      is_active: true,
      low_stock_threshold: 0,
      image_url: "",
    },
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (productToEdit) {
        form.reset({
          id: productToEdit.id,
          name: productToEdit.name,
          unique_reference: productToEdit.unique_reference,
          description: productToEdit.description ?? "",
          category_id: productToEdit.category_id ?? "",
          product_unit_abbreviation: productToEdit.product_unit_abbreviation ?? "",
          purchase_price: productToEdit.purchase_price,
          sale_price: productToEdit.sale_price,
          is_active: productToEdit.is_active,
          low_stock_threshold: productToEdit.low_stock_threshold,
          image_url: productToEdit.image_url ?? "",
        });
        setNameInput(productToEdit.name ?? "");
      } else {
        form.reset({
          name: "",
          unique_reference: "",
          description: "",
          category_id: "",
          product_unit_abbreviation: "",
          purchase_price: 0,
          sale_price: 0,
          is_active: true,
          low_stock_threshold: 0,
          image_url: "",
        });
        setNameInput("");
      }
      form.clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, productToEdit]);

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    setIsLoading(true);
    let error = null;

    // Prepare payload for Supabase
    const payload = {
      name: values.name,
      unique_reference: values.unique_reference,
      description: values.description || null,
      category_id: values.category_id || null,
      product_unit_abbreviation: values.product_unit_abbreviation || null,
      purchase_price: values.purchase_price,
      sale_price: values.sale_price,
      is_active: values.is_active,
      low_stock_threshold: values.low_stock_threshold,
      image_url: values.image_url || null,
    };

    if (productToEdit && productToEdit.id) {
      const { error: dbUpdateError } = await supabaseClient
        .from("products")
        .update(payload)
        .eq("id", productToEdit.id);
      error = dbUpdateError;

      if (error) {
        toast.error("Failed to update product.", { description: error.message });
      } else {
        toast.success("Product updated successfully!");
        setIsDialogOpen(false);
        onProductSubmitted();
      }
    } else {
      const { error: dbInsertError } = await supabaseClient
        .from("products")
        .insert(payload);
      error = dbInsertError;

      if (error) {
        toast.error("Failed to add new product.", { description: error.message });
      } else {
        toast.success("New product added successfully!");
        setIsDialogOpen(false);
        onProductSubmitted();
      }
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!productToEdit?.id) {
      toast.error("Product ID missing for deletion.");
      setIsLoading(false);
      return;
    }

    const { error: dbDeleteError } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", productToEdit.id);

    if (dbDeleteError) {
      toast.error(
        `Failed to delete product. ${dbDeleteError.message}`
      );
    } else {
      toast.success("Product deleted successfully!");
      setIsConfirmDeleteOpen(false);
      setIsDialogOpen(false);
      onProductSubmitted();
    }
    setIsLoading(false);
  };

  const openEditDialog = () => {
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = () => {
    setIsConfirmDeleteOpen(true);
  };

  // Memoized unit abbreviation from category
  const watchedCategoryId = form.watch("category_id");
  const displayedUnitAbbreviation = useMemo(() => {
    const selectedCategory = categories.find(
      (cat) => cat.id === watchedCategoryId
    );
    return selectedCategory?.unit_abbreviation || "";
  }, [watchedCategoryId, categories]);

  // Autocomplete suggestion list logic for name field
  const getNameSuggestions = (input: string) => {
    if (!input) return [];
    const lower = input.toLowerCase();
    return TILE_DIMENSIONS_SUGGESTIONS.filter((s) =>
      s.toLowerCase().includes(lower)
    );
  };

  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNameInput(value);
    form.setValue("name", value, { shouldValidate: true });
  };

  const handleNameSuggestionClick = (suggestion: string) => {
    setNameInput(suggestion);
    form.setValue("name", suggestion, { shouldValidate: true });
    setIsNameFocused(false);
  };

  const handleNameBlur = () => {
    setTimeout(() => setIsNameFocused(false), 100); // allow click
  };

  return (
    <>
      {!productToEdit ? (
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      ) : (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openEditDialog}
            title="Edit Product"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={openDeleteConfirm}
            title="Delete Product"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {!productToEdit
                ? "Add New Product"
                : `Edit Product: ${productToEdit?.name}`}
            </DialogTitle>
            <DialogDescription>
              {!productToEdit
                ? "Enter details for the new product."
                : "Make changes to the product details here."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2 relative">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={nameInput}
                  onChange={handleNameInputChange}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={handleNameBlur}
                  disabled={isLoading}
                  autoComplete="off"
                />
                {isNameFocused &&
                  getNameSuggestions(nameInput).length > 0 && (
                    <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-300 shadow rounded mt-1 max-h-40 overflow-auto text-sm">
                      {getNameSuggestions(nameInput).map((sugg) => (
                        <li
                          key={sugg}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                          onMouseDown={() => handleNameSuggestionClick(sugg)}
                        >
                          {sugg}
                        </li>
                      ))}
                    </ul>
                  )}
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unique_reference">Reference</Label>
                <Input
                  id="unique_reference"
                  {...form.register("unique_reference")}
                  disabled={isLoading}
                />
                {form.formState.errors.unique_reference && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.unique_reference.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                {...form.register("description")}
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  onValueChange={(value) =>
                    form.setValue("category_id", value, {
                      shouldValidate: true,
                    })
                  }
                  value={form.watch("category_id")}
                  disabled={isLoading}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category_id && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.category_id.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product_unit_abbreviation">Unit</Label>
                <Input
                  id="product_unit_abbreviation"
                  value={displayedUnitAbbreviation}
                  disabled
                />
                {form.formState.errors.product_unit_abbreviation && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.product_unit_abbreviation.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  {...form.register("purchase_price", { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {form.formState.errors.purchase_price && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.purchase_price.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sale_price">Sale Price</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  {...form.register("sale_price", { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {form.formState.errors.sale_price && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.sale_price.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  step="1"
                  {...form.register("low_stock_threshold", { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {form.formState.errors.low_stock_threshold && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.low_stock_threshold.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image_url">Image URL (Optional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  {...form.register("image_url")}
                  disabled={isLoading}
                />
                {form.formState.errors.image_url && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.image_url.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                {...form.register("is_active")}
                disabled={isLoading}
              />
              <Label htmlFor="is_active">Is Active</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? !productToEdit
                    ? "Adding Product..."
                    : "Saving..."
                  : !productToEdit
                    ? "Add Product"
                    : "Save Changes"}
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
              Are you sure you want to delete product &quot;{productToEdit?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 