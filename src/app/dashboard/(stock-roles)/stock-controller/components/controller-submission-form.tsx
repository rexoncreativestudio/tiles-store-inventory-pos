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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  WarehouseForController,
  ControllerStockSubmissionFormValues,
  controllerStockSubmissionFormSchema,
  ProductCategory,
  PendingAuditRecord,
} from '../types';

// Helper to format date for datetime-local input
function toDatetimeLocal(date: Date): string {
  return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
}

// Helper to get Tiles category id
function getTilesCategoryId(categories: ProductCategory[]): string {
  const tilesCat = categories.find(cat => cat.name?.toLowerCase().startsWith("tiles"));
  return tilesCat?.id || "";
}

// Dimension suggestions for product name field (with " -|" at the end)
const dimensionSuggestions = [
  "2.5cm x 2.5cm -|",
  "5cm x 5cm -|",
  "5cm x 20cm -|",
  "7.5cm x 15cm -|",
  "7.5cm x 30cm -|",
  "10cm x 10cm -|",
  "10cm x 20cm -|",
  "10cm x 30cm -|",
  "10cm x 40cm -|",
  "15cm x 15cm -|",
  "15cm x 30cm -|",
  "15cm x 60cm -|",
  "15cm x 90cm -|",
  "20cm x 20cm -|",
  "20cm x 30cm -|",
  "20cm x 40cm -|",
  "20cm x 50cm -|",
  "20cm x 60cm -|",
  "20cm x 80cm -|",
  "20cm x 120cm -|",
  "22cm x 90cm -|",
  "25cm x 25cm -|",
  "25cm x 40cm -|",
  "25cm x 50cm -|",
  "25cm x 60cm -|",
  "30cm x 30cm -|",
  "30cm x 60cm -|",
  "30cm x 90cm -|",
  "30cm x 120cm -|",
  "33cm x 33cm -|",
  "40cm x 40cm -|",
  "40cm x 80cm -|",
  "40cm x 120cm -|",
  "45cm x 45cm -|",
  "45cm x 90cm -|",
  "50cm x 50cm -|",
  "50cm x 100cm -|",
  "60cm x 60cm -|",
  "60cm x 120cm -|",
  "75cm x 75cm -|",
  "75cm x 150cm -|",
  "80cm x 80cm -|",
  "90cm x 90cm -|",
  "100cm x 100cm -|",
  "120cm x 120cm -|",
  "120cm x 240cm -|",
  "160cm x 320cm -|"
];

export default function ControllerSubmissionForm({
  warehouses,
  allCategories,
  recordedByUserId,
  initialSubmission,
  isOpen = false,
  onClose = () => {},
  onSubmissionSuccess = () => {},
}: {
  warehouses: WarehouseForController[],
  allCategories: ProductCategory[],
  recordedByUserId: string,
  initialSubmission?: PendingAuditRecord | null,
  isOpen?: boolean,
  onClose?: () => void,
  onSubmissionSuccess?: () => void,
}) {
  const [isLoading, setIsLoading] = useState(false);

  // Product list for reference autocomplete
  const [productList, setProductList] = useState<
    {
      id: string;
      unique_reference: string;
      name: string;
      category_id: string;
      product_unit_abbreviation: string | null;
    }[]
  >([]);

  // Track which autocomplete is open
  const [focusedProductRefIndex, setFocusedProductRefIndex] = useState<number | null>(null);
  // Track product ref input values per row
  const [productRefInputs, setProductRefInputs] = useState<Record<number, string>>({});

  // --- Product Name Dimension Autocomplete Logic ---
  const [focusedProductNameIndex, setFocusedProductNameIndex] = useState<number | null>(null);
  const [productNameInputs, setProductNameInputs] = useState<Record<number, string>>({});

  // Submission date state for Calendar
  const [submissionDate, setSubmissionDate] = useState<Date | null>(new Date());
  // Track time input for submission date
  const [submissionTime, setSubmissionTime] = useState<string>(format(new Date(), "HH:mm"));

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
        category_id: getTilesCategoryId(allCategories),
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

  // Fetch products from DB on modal open
  useEffect(() => {
    if (isOpen) {
      (async () => {
        const { data, error } = await supabaseClient
          .from('products')
          .select('id, unique_reference, name, category_id, product_unit_abbreviation')
          .order('unique_reference', { ascending: true });
        if (data) setProductList(data);
        if (error) toast.error("Failed to fetch product list for audit input", { description: error.message });
      })();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialSubmission) {
        const dateObj = new Date(initialSubmission.submission_date);
        setSubmissionDate(dateObj);
        setSubmissionTime(format(dateObj, "HH:mm"));
        form.reset({
          submission_id: initialSubmission.id,
          warehouse_id: initialSubmission.warehouse_id,
          submission_date: toDatetimeLocal(dateObj),
          products_submitted: initialSubmission.submission_details.map((p) => ({
            tempId: crypto.randomUUID(),
            product_name: p.product_name,
            product_ref: p.product_ref,
            quantity: p.quantity,
            category_id: p.category_id || getTilesCategoryId(allCategories),
            product_unit_abbreviation: p.product_unit_abbreviation || '',
          })),
          notes_from_controller: initialSubmission.notes_from_controller || '',
        });
        setProductRefInputs({});
        setProductNameInputs({});
      } else {
        const now = new Date();
        setSubmissionDate(now);
        setSubmissionTime(format(now, "HH:mm"));
        form.reset({
          submission_id: undefined,
          warehouse_id: '',
          submission_date: toDatetimeLocal(now),
          products_submitted: [{
            tempId: crypto.randomUUID(),
            product_name: '',
            product_ref: '',
            quantity: 1,
            category_id: getTilesCategoryId(allCategories),
            product_unit_abbreviation: '',
          }],
          notes_from_controller: '',
        });
        setProductRefInputs({});
        setProductNameInputs({});
      }
      form.clearErrors();
    }
  }, [isOpen, initialSubmission, form, allCategories]);

  // Sync form submission_date on change of date or time
  useEffect(() => {
    if (submissionDate) {
      let newDate = new Date(submissionDate);
      // Set time from submissionTime input
      const [hours, minutes] = submissionTime.split(":");
      newDate.setHours(Number(hours) || 0, Number(minutes) || 0);
      form.setValue("submission_date", toDatetimeLocal(newDate), { shouldValidate: true });
    }
  }, [submissionDate, submissionTime, form]); // <-- ADDED form to dependencies

  const isEditing = !!initialSubmission?.id;

  // Submission handler
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

  // --- AUTOCOMPLETE LOGIC FOR PRODUCT REFERENCE ---
  // Filter suggestions locally from productList (case-insensitive, show only if input is non-empty)
  const getReferenceSuggestions = (input: string) => {
    if (!input) return [];
    const upper = input.toUpperCase();
    // Show tile dimension suggestions if input starts with a number
    if (/^\d/.test(input.trim())) {
      return dimensionSuggestions.filter(dim => dim.replace(/\s+/g, '').toLowerCase().includes(input.replace(/\s+/g, '').toLowerCase()))
        .map(dim => ({ unique_reference: dim, name: "Tile Dimension" }));
    }
    return productList.filter(p => p.unique_reference.includes(upper));
  };

  // Product Reference input change: always uppercase, update value, check for match to autofill
  const handleProductRefChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase(); // enforce uppercase

    setProductRefInputs(prev => ({ ...prev, [index]: value }));
    form.setValue(`products_submitted.${index}.product_ref`, value, { shouldValidate: true });

    // Try to find existing product by reference
    const match = productList.find(p => p.unique_reference === value);

    if (match) {
      // Autofill name, category, unit_abbreviation, and lock their fields
      form.setValue(`products_submitted.${index}.product_name`, match.name, { shouldValidate: true });
      form.setValue(`products_submitted.${index}.category_id`, match.category_id, { shouldValidate: true });
      form.setValue(`products_submitted.${index}.product_unit_abbreviation`, match.product_unit_abbreviation || '');
    } else {
      // Reset autofilled fields if no match
      form.setValue(`products_submitted.${index}.product_name`, '', { shouldValidate: false });
      form.setValue(`products_submitted.${index}.category_id`, getTilesCategoryId(allCategories), { shouldValidate: false });
      form.setValue(`products_submitted.${index}.product_unit_abbreviation`, '');
    }
  };

  // On selecting a suggestion, fill reference and autofill fields
  const handleReferenceSuggestionClick = (index: number, suggestion: string) => {
    setProductRefInputs(prev => ({ ...prev, [index]: suggestion }));
    form.setValue(`products_submitted.${index}.product_ref`, suggestion, { shouldValidate: true });

    const match = productList.find(p => p.unique_reference === suggestion);
    if (match) {
      form.setValue(`products_submitted.${index}.product_name`, match.name, { shouldValidate: true });
      form.setValue(`products_submitted.${index}.category_id`, match.category_id, { shouldValidate: true });
      form.setValue(`products_submitted.${index}.product_unit_abbreviation`, match.product_unit_abbreviation || '');
    }
    setFocusedProductRefIndex(null); // close suggestion dropdown
  };

  // Hide suggestions when input loses focus, but delay to allow click
  const handleRefBlur = () => {
    setTimeout(() => setFocusedProductRefIndex(null), 100);
  };

  // Helper to check if reference is a match in productList
  const isReferenceExisting = (ref: string) => productList.some(p => p.unique_reference === ref);

  // --- Product Name Dimension Autocomplete Logic ---
  // Filter dimension suggestions based on input, only if it starts with a number
  const getDimensionSuggestions = (input: string) => {
    if (!input) return [];
    // Only show if input starts with a number
    if (!/^\d/.test(input.trim())) return [];
    const normalizedInput = input.trim().replace(/\s+/g, '').toLowerCase();
    return dimensionSuggestions.filter(dim => {
      // Normalize for comparison
      const normalizedDim = dim.replace(/\s+/g, '').toLowerCase();
      return normalizedDim.startsWith(normalizedInput) || normalizedDim.includes(normalizedInput);
    });
  };

  // Product Name input change
  const handleProductNameChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProductNameInputs(prev => ({ ...prev, [index]: value }));
    form.setValue(`products_submitted.${index}.product_name`, value, { shouldValidate: true });
  };

  // On selecting a dimension suggestion, fill product name field
  const handleDimensionSuggestionClick = (index: number, suggestion: string) => {
    setProductNameInputs(prev => ({ ...prev, [index]: suggestion }));
    form.setValue(`products_submitted.${index}.product_name`, suggestion, { shouldValidate: true });
    setFocusedProductNameIndex(null);
  };

  // Hide suggestions when input loses focus, but delay to allow click
  const handleProductNameBlur = () => {
    setTimeout(() => setFocusedProductNameIndex(null), 100);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Submission Date using Calendar */}
            <div className="space-y-2">
              <Label htmlFor="submission_date">Submission Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {submissionDate
                      ? format(submissionDate, "PPP")
                      : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={submissionDate ?? undefined}
                    onSelect={date => {
                      setSubmissionDate(date ?? new Date());
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* Show time input for hour/minute selection */}
              <Input
                id="submission_time"
                type="time"
                value={submissionTime}
                onChange={e => {
                  setSubmissionTime(e.target.value);
                }}
                disabled={isLoading}
                className="w-full mt-2"
              />
              {form.formState.errors.submission_date && <p className="text-red-500 text-sm">{form.formState.errors.submission_date.message}</p>}
            </div>
            {/* Warehouse remains unchanged */}
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
            {fields.map((field, index) => {
              const refValue = productRefInputs[index] ?? form.getValues(`products_submitted.${index}.product_ref`);
              const isExisting = isReferenceExisting(refValue);
              const productNameValue = productNameInputs[index] ?? form.getValues(`products_submitted.${index}.product_name`);

              return (
                <Card key={field.id} className="p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-start">
                    {/* --- Product Reference Autocomplete --- */}
                    <div className="space-y-2 lg:col-span-2 relative">
                      <Label>Product Reference</Label>
                      <Input
                        value={refValue}
                        onChange={e => handleProductRefChange(index, e)}
                        onFocus={() => setFocusedProductRefIndex(index)}
                        onBlur={handleRefBlur}
                        disabled={isLoading}
                        autoComplete="off"
                        placeholder="Enter reference"
                        className="uppercase"
                        inputMode="text"
                      />
                      {/* Only show suggestions if focused and input is non-empty */}
                      {focusedProductRefIndex === index &&
                        getReferenceSuggestions(refValue).length > 0 && (
                          <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-300 shadow rounded mt-1 max-h-40 overflow-auto text-sm">
                            {getReferenceSuggestions(refValue).map((p) => (
                              <li
                                key={p.unique_reference}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                onMouseDown={() => handleReferenceSuggestionClick(index, p.unique_reference)}
                              >
                                <span className="font-mono">{p.unique_reference}</span>
                                <span className="ml-2 text-xs text-gray-600">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      {form.formState.errors.products_submitted?.[index]?.product_ref && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].product_ref?.message}</p>}
                    </div>
                    {/* --- Product Name (dimension autocomplete if starts with number) --- */}
                    <div className="space-y-2 relative lg:col-span-2">
                      <Label>Product Name</Label>
                      <Input
                        value={productNameValue}
                        onChange={e => handleProductNameChange(index, e)}
                        onFocus={() => setFocusedProductNameIndex(index)}
                        onBlur={handleProductNameBlur}
                        disabled={isLoading || isExisting}
                        readOnly={isExisting}
                        placeholder={isExisting ? "Auto-filled" : "Enter product name"}
                        className={isExisting ? "bg-gray-100" : ""}
                      />
                      {/* Only show dimension suggestions if focused, not existing, and input starts with number */}
                      {focusedProductNameIndex === index &&
                        !isExisting &&
                        getDimensionSuggestions(productNameValue).length > 0 && (
                          <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-300 shadow rounded mt-1 max-h-40 overflow-auto text-sm">
                            {getDimensionSuggestions(productNameValue).map((dim) => (
                              <li
                                key={dim}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                onMouseDown={() => handleDimensionSuggestionClick(index, dim)}
                              >
                                {dim}
                              </li>
                            ))}
                          </ul>
                        )}
                      {form.formState.errors.products_submitted?.[index]?.product_name && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].product_name?.message}</p>}
                    </div>
                    {/* --- Category (autofilled & locked if existing) --- */}
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Controller
                        control={form.control}
                        name={`products_submitted.${index}.category_id`}
                        render={({ field: controllerField }) => (
                          <Select
                            onValueChange={controllerField.onChange}
                            value={controllerField.value || getTilesCategoryId(allCategories)}
                            disabled={isLoading || isExisting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.products_submitted?.[index]?.category_id && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].category_id?.message}</p>}
                    </div>
                    {/* --- Quantity --- */}
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        {...form.register(`products_submitted.${index}.quantity`, { valueAsNumber: true })}
                        disabled={isLoading}
                        placeholder="Enter quantity"
                      />
                      {form.formState.errors.products_submitted?.[index]?.quantity && <p className="text-red-500 text-sm">{form.formState.errors.products_submitted[index].quantity?.message}</p>}
                    </div>
                    {/* --- Remove Button --- */}
                    <div className="lg:col-span-full flex justify-end items-center mt-2">
                      {fields.length > 1 && (
                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} disabled={isLoading}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => append({
                tempId: crypto.randomUUID(),
                product_name: '',
                product_ref: '',
                quantity: 1,
                category_id: getTilesCategoryId(allCategories),
                product_unit_abbreviation: '',
              })}
              disabled={isLoading}
            >
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