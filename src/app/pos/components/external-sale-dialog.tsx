import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, XCircle, CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useForm,
  useFieldArray,
  useWatch,
  SubmitHandler,
  FieldErrors,
  FieldError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  externalSaleFormSchema,
  CategoryForPos,
  ExternalSaleFormValues,
  ExternalSaleItemValues,
} from "@/app/pos/types";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export interface ExternalSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryForPos[];
  onSubmit: (values: ExternalSaleFormValues) => void;
  isProcessing: boolean;
  initialValues?: Partial<ExternalSaleFormValues>;
}

// --- SUGGESTIONS FOR TILE DIMENSIONS ---
const TILE_DIMENSIONS_SUGGESTIONS = [
  "2.5cm x 2.5cm |", "5cm x 5cm |", "5cm x 20cm |", "7.5cm x 15cm |", "7.5cm x 30cm |",
  "10cm x 10cm |", "10cm x 20cm |", "10cm x 30cm |", "10cm x 40cm |",
  "15cm x 15cm |", "15cm x 30cm |", "15cm x 60cm |", "15cm x 90cm |",
  "20cm x 20cm |", "20cm x 30cm |", "20cm x 40cm |", "20cm x 50cm |", "20cm x 60cm |",
  "20cm x 80cm |", "20cm x 120cm |", "22cm x 90cm |",
  "25cm x 25cm |", "25cm x 40cm |", "25cm x 50cm |", "25cm x 60cm |",
  "30cm x 30cm |", "30cm x 60cm |", "30cm x 90cm |", "30cm x 120cm |",
  "33cm x 33cm |", "40cm x 40cm |", "40cm x 80cm |", "40cm x 120cm |",
  "45cm x 45cm |", "45cm x 90cm |", "50cm x 50cm |", "50cm x 100cm |",
  "60cm x 60cm |", "60cm x 120cm |", "75cm x 75cm |", "75cm x 150cm |",
  "80cm x 80cm |", "90cm x 90cm |", "100cm x 100cm |",
  "120cm x 120cm |", "120cm x 240cm |", "160cm x 320cm |"
];

// --- AUTOCOMPLETE HOOKS ---
function useProductNameAutocomplete(itemsLength: number) {
  const [focusedProductIndex, setFocusedProductIndex] = useState<number | null>(null);
  const [productNameInputs, setProductNameInputs] = useState<{ [index: number]: string }>({});

  useEffect(() => {
    setProductNameInputs((prev) => {
      const newInputs: typeof prev = {};
      for (let i = 0; i < itemsLength; i++) newInputs[i] = prev[i] || "";
      return newInputs;
    });
  }, [itemsLength]);

  return {
    focusedProductIndex,
    setFocusedProductIndex,
    productNameInputs,
    setProductNameInputs,
  };
}

function getProductNameSuggestions(input: string) {
  if (!input) return [];
  const lower = input.toLowerCase();
  // Only show if input starts with a number or matches any part
  if (/^\d/.test(input.trim())) {
    return TILE_DIMENSIONS_SUGGESTIONS.filter((s) =>
      s.replace(/\s+/g, "").toLowerCase().includes(lower.replace(/\s+/g, ""))
    );
  }
  return [];
}

function getItemError(
  errors: FieldErrors<ExternalSaleFormValues> | undefined,
  index: number,
  field: keyof ExternalSaleItemValues
): FieldError | undefined {
  if (
    errors &&
    errors.items &&
    Array.isArray(errors.items) &&
    errors.items[index] &&
    typeof errors.items[index] === "object" &&
    errors.items[index] !== null
  ) {
    return (errors.items[index] as Record<string, FieldError | undefined>)[field];
  }
  return undefined;
}

// Helper to get default tiles category id
function getTilesCategoryId(categories: CategoryForPos[]): string | null {
  const found = categories.find(cat => cat.name?.toLowerCase().includes("tiles"));
  return found?.id ?? null;
}

// Helper to get unit abbreviation for category id
function getUnitAbbreviationForCategory(categories: CategoryForPos[], categoryId: string | null): string {
  if (!categoryId) return "";
  const found = categories.find(cat => cat.id === categoryId);
  return found?.unit_abbreviation ?? "";
}

export default function ExternalSaleDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
  isProcessing,
  initialValues = {},
}: ExternalSaleDialogProps) {
  // Stable initialValues via useRef (never in dependency)
  const stableInitialValues = useRef<Partial<ExternalSaleFormValues>>(initialValues);
  useEffect(() => {
    stableInitialValues.current = initialValues;
  }, [initialValues]);

  // --- Fix: Avoid duplicate "date" property and ensure it's always present as a Date ---
  const defaultFormValues = useMemo<ExternalSaleFormValues>(() => {
    const tilesCategoryId = getTilesCategoryId(categories);
    const base: ExternalSaleFormValues = {
      customerName: "",
      customerPhone: "",
      items: [],
      status: "completed",
      date: new Date(),
      ...stableInitialValues.current,
    };
    if (typeof base.date === "string") {
      base.date = new Date(base.date);
    }
    if (!base.date || isNaN(new Date(base.date).getTime())) {
      base.date = new Date();
    }
    // Ensure default category for each item (Tiles) AND set unit name
    if (base.items && Array.isArray(base.items)) {
      base.items = base.items.map(item => {
        const catId = item.product_category_id ?? tilesCategoryId;
        return {
          ...item,
          product_category_id: catId,
          product_unit_name: item.product_unit_name ?? getUnitAbbreviationForCategory(categories, catId),
        };
      });
    }
    return base;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- empty array, do not depend on stableInitialValues.current

  const resolver = zodResolver(externalSaleFormSchema) as any;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ExternalSaleFormValues>({
    resolver,
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
    keyName: "fieldId",
  });

  const watchedItems = useWatch({ control, name: "items" }) as ExternalSaleItemValues[];
  const status = useWatch({ control, name: "status" }) as "completed" | "held";
  const dateValue = useWatch({ control, name: "date" }) as Date;
  const { formatCurrency } = useCurrencyFormatter();

  const saleTotal = (watchedItems ?? []).reduce(
    (sum: number, item: ExternalSaleItemValues) =>
      sum + ((Number(item?.quantity) || 0) * (Number(item?.unit_sale_price) || 0)),
    0
  );

  // --- AUTOCOMPLETE STATE ---
  const {
    focusedProductIndex,
    setFocusedProductIndex,
    productNameInputs,
    setProductNameInputs,
  } = useProductNameAutocomplete(fields.length);

  // --- HANDLERS FOR AUTOCOMPLETE ---
  const handleProductNameChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProductNameInputs((prev) => ({ ...prev, [index]: value }));
    setValue(`items.${index}.product_name`, value, { shouldValidate: true });
  };

  const handleSuggestionClick = (index: number, suggestion: string) => {
    setProductNameInputs((prev) => ({ ...prev, [index]: suggestion }));
    setValue(`items.${index}.product_name`, suggestion, { shouldValidate: true });
    setFocusedProductIndex(null);
  };

  const handleSuggestionBlur = () => {
    setTimeout(() => setFocusedProductIndex(null), 100);
  };

  // Only reset when dialog closes (open -> false)
  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current && !open) {
      reset(defaultFormValues);
      setProductNameInputs({});
    }
    prevOpen.current = open;
  }, [open, reset, defaultFormValues, setProductNameInputs]);

  // Only set date if not set or invalid
  useEffect(() => {
    if (open && (!dateValue || isNaN(new Date(dateValue).getTime()))) {
      setValue("date", new Date(), { shouldValidate: true });
    }
  }, [open, dateValue, setValue]);

  // Ensure that each item's category change updates the unit name accordingly
  useEffect(() => {
    watchedItems?.forEach((item, idx) => {
      // Only set unit if category is defined and unit is blank or outdated
      const currentCatId = item.product_category_id;
      const expectedUnit = getUnitAbbreviationForCategory(categories, currentCatId);
      if ((item.product_unit_name ?? "") !== expectedUnit) {
        setValue(`items.${idx}.product_unit_name`, expectedUnit, { shouldValidate: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, watchedItems?.map(i => i.product_category_id).join(",")]);

  // --- Submit Handler ---
  const handleFormSubmit: SubmitHandler<ExternalSaleFormValues> = (values) => {
    // Before submit, ensure unit names are up to date for each category
    const patched = {
      ...values,
      items: values.items.map(item => ({
        ...item,
        product_unit_name: getUnitAbbreviationForCategory(categories, item.product_category_id),
      })),
    };
    onSubmit(patched);
  };

  const tilesCategoryId = getTilesCategoryId(categories);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] w-full max-h-[98vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Record External Sale
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mb-4">
            Enter external sale details. All fields are required unless marked optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Customer Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="customerName" className="mb-2 block text-base font-semibold">
                Customer Name
              </Label>
              <Input
                id="customerName"
                autoFocus
                {...register("customerName")}
                className="h-12 text-base"
                disabled={isProcessing}
              />
              {errors.customerName && (
                <span className="text-red-500 text-xs">
                  {errors.customerName.message}
                </span>
              )}
            </div>
            <div>
              <Label htmlFor="customerPhone" className="mb-2 block text-base font-semibold">
                Customer Phone (Optional)
              </Label>
              <Input
                id="customerPhone"
                {...register("customerPhone")}
                className="h-12 text-base"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* --- Date field --- */}
          <div>
            <Label htmlFor="externalSaleDate" className="mb-2 block text-base font-semibold">
              Sale Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full h-12 text-base font-normal flex items-center justify-between`}
                  type="button"
                  disabled={isProcessing}
                >
                  {dateValue
                    ? format(dateValue, "dd/MM/yyyy")
                    : <span className="text-muted-foreground">Pick a date</span>
                  }
                  <CalendarIcon className="ml-2 h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={dateValue ?? new Date()}
                  onSelect={(date) => date && setValue("date", date, { shouldValidate: true })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <span className="text-red-500 text-xs mt-1 block">
                {errors.date.message}
              </span>
            )}
          </div>

          {/* Sale Items Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Sale Items</h3>
              <Button
                type="button"
                variant="outline"
                className="border-dashed border-2 border-primary/60 text-primary font-semibold py-2 px-4"
                onClick={() =>
                  append({
                    tempId: crypto.randomUUID(),
                    product_name: "",
                    product_category_id: tilesCategoryId,
                    product_unit_name: getUnitAbbreviationForCategory(categories, tilesCategoryId),
                    quantity: 1,
                    unit_sale_price: 0,
                    note: "",
                  })
                }
                disabled={isProcessing}
              >
                <PlusCircle className="mr-2 h-5 w-5" /> Add Item
              </Button>
            </div>
            <div className="space-y-5">
              {fields.length === 0 && (
                <div className="text-center text-muted-foreground py-8 border rounded bg-muted/30">
                  No sale items added yet.
                </div>
              )}
              {fields.map((item, index) => {
                const watchedItem = watchedItems?.[index] ?? {};
                const qty = Number(watchedItem.quantity) || 0;
                const salePrice = Number(watchedItem.unit_sale_price) || 0;
                const itemTotal = qty * salePrice;
                return (
                  <div
                    key={item.tempId ?? item.fieldId}
                    className="bg-white border border-muted rounded-xl p-4"
                  >
                    {/* Main row: Name, Category, Unit, Qty, Sale Price, Remove */}
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1.3fr_1fr_1fr_1fr_40px] gap-4 items-end">
                      <div className="relative">
                        <Label className="block mb-1">Name / Reference</Label>
                        <Input
                          value={
                            productNameInputs[index] ??
                            watchedItem.product_name ??
                            ""
                          }
                          onChange={(e) => handleProductNameChange(index, e)}
                          onFocus={() => setFocusedProductIndex(index)}
                          onBlur={handleSuggestionBlur}
                          className="h-10"
                          disabled={isProcessing}
                          autoComplete="off"
                        />
                        {focusedProductIndex === index &&
                          getProductNameSuggestions(productNameInputs[index] ?? watchedItem.product_name ?? "").length > 0 && (
                            <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-300 shadow rounded mt-1 max-h-40 overflow-auto text-sm">
                              {getProductNameSuggestions(productNameInputs[index] ?? watchedItem.product_name ?? "").map((sugg) => (
                                <li
                                  key={sugg}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                  onMouseDown={() => handleSuggestionClick(index, sugg)}
                                >
                                  {sugg}
                                </li>
                              ))}
                            </ul>
                          )}
                        {getItemError(errors, index, "product_name") && (
                          <span className="text-red-500 text-xs">
                            {getItemError(errors, index, "product_name")?.message}
                          </span>
                        )}
                      </div>
                      <div>
                        <Label className="block mb-1">Category</Label>
                        <Select
                          value={watchedItem.product_category_id ?? tilesCategoryId ?? "none"}
                          onValueChange={(value) => {
                            setValue(
                              `items.${index}.product_category_id`,
                              value === "none" ? null : value,
                              { shouldValidate: true }
                            );
                            const selectedCategory = categories.find(
                              (cat) => cat.id === value
                            );
                            setValue(
                              `items.${index}.product_unit_name`,
                              selectedCategory?.unit_abbreviation || "",
                              { shouldValidate: true }
                            );
                          }}
                          disabled={isProcessing}
                        >
                          <SelectTrigger className="h-10">
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
                        {getItemError(errors, index, "product_category_id") && (
                          <span className="text-red-500 text-xs">
                            {getItemError(errors, index, "product_category_id")?.message}
                          </span>
                        )}
                      </div>
                      <div>
                        <Label className="block mb-1">Unit</Label>
                        <Input
                          {...register(`items.${index}.product_unit_name` as const)}
                          className="h-10"
                          disabled
                          value={watchedItem.product_unit_name ?? ""}
                          placeholder="Auto"
                        />
                      </div>
                      <div>
                        <Label className="block mb-1">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantity` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-10"
                          disabled={isProcessing}
                        />
                        {getItemError(errors, index, "quantity") && (
                          <span className="text-red-500 text-xs">
                            {getItemError(errors, index, "quantity")?.message}
                          </span>
                        )}
                      </div>
                      <div>
                        <Label className="block mb-1">Sale Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.unit_sale_price` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-10"
                          disabled={isProcessing}
                        />
                        {getItemError(errors, index, "unit_sale_price") && (
                          <span className="text-red-500 text-xs">
                            {getItemError(errors, index, "unit_sale_price")?.message}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-between pt-2">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-red-600"
                            disabled={isProcessing}
                            title="Remove item"
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Second row: Note (Optional) */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:gap-6">
                      <div className="flex-1">
                        <Label className="block mb-1">Note (Optional)</Label>
                        <Input
                          {...register(`items.${index}.note` as const)}
                          className="h-10"
                          disabled={isProcessing}
                          placeholder="Add details if needed"
                        />
                      </div>
                    </div>
                    {/* Item Total */}
                    <div className="mt-3 flex justify-end">
                      <div className="text-lg font-bold">
                        Item Total: <span className="text-xl font-extrabold">{formatCurrency(itemTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status and Summary Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-t pt-6">
            <div>
              <Label className="mb-2 block text-base font-semibold">Status</Label>
              <div className="flex gap-6">
                <label
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                  ${
                    status === "completed"
                      ? "bg-green-50 border-green-400 shadow-sm"
                      : "hover:bg-green-100 border-green-200"
                  }`}
                >
                  <input
                    type="radio"
                    {...register("status")}
                    value="completed"
                    checked={status === "completed"}
                    className="accent-green-600 w-5 h-5 rounded"
                    style={{ accentColor: "#16a34a" }}
                    disabled={isProcessing}
                  />
                  <span className="text-green-700 font-medium">Completed</span>
                </label>
                <label
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                  ${
                    status === "held"
                      ? "bg-gray-100 border-gray-400 shadow-sm"
                      : "hover:bg-gray-200 border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    {...register("status")}
                    value="held"
                    checked={status === "held"}
                    className="accent-gray-400 w-5 h-5 rounded"
                    style={{ accentColor: "#d1d5db" }}
                    disabled={isProcessing}
                  />
                  <span className="text-gray-700 font-medium">Held</span>
                </label>
              </div>
            </div>
            <div className="ml-auto flex flex-col items-end">
              <div className="text-lg font-bold">Sale Total:</div>
              <div className="text-2xl font-extrabold">{formatCurrency(saleTotal)}</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="inline-flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Confirm External Sale"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}   