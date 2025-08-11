import { z } from "zod";

// --- Product, Category, Stock Types ---

export type ProductForPos = {
  id: string;
  unique_reference: string;
  name: string;
  image_url: string | null;
  sale_price: number;
  low_stock_threshold: number;
  category_id: string | null;
};

export type ProductStockDetail = {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  warehouses: {
    id: string;
    name: string;
  } | null;
};

export type CategoryForPos = {
  id: string;
  name: string;
  unit_abbreviation: string | null;
};

// --- Cart and Form Types ---

export type WarehouseSelection = {
  warehouse_id: string;
  warehouse_name: string;
  deducted_quantity: number;
};

export interface CartItem {
  id: string;
  name: string;
  unique_reference: string;
  quantity: number;
  unit_sale_price: number;
  total_line_price: number;
  note?: string;
  image_url?: string | null;
  warehouse_selections: WarehouseSelection[];
}

export type ItemToCartValues = {
  productId: string;
  quantity: number;
  unitPrice: number;
  warehouseSelections: WarehouseSelection[];
  note?: string;
};

// --- Zod schema for form validation ---

export const warehouseSelectionSchema = z.object({
  warehouse_id: z.string(),
  warehouse_name: z.string(),
  deducted_quantity: z.number().min(0),
});

export const itemToCartSchema = z
  .object({
    productId: z.string(),
    quantity: z.number().min(1, { message: "Quantity must be at least 1." }),
    unitPrice: z.number().min(0, { message: "Unit price must be non-negative." }),
    warehouseSelections: z
      .array(warehouseSelectionSchema)
      .refine(
        (arr: WarehouseSelection[]) => arr.some((ws) => ws.deducted_quantity > 0),
        { message: "Select at least one warehouse with stock." }
      ),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const total = data.warehouseSelections.reduce(
      (sum: number, ws: WarehouseSelection) => sum + ws.deducted_quantity,
      0
    );
    if (total !== data.quantity) {
      ctx.addIssue({
        path: ["warehouseSelections"],
        code: z.ZodIssueCode.custom,
        message: "Sum of selected warehouse quantities must match total quantity.",
      });
    }
  });

// --- External Sale Types ---

export const externalSaleItemSchema = z.object({
  tempId: z.string().uuid(),
  product_name: z.string().min(1, { message: "Product name is required." }),
  product_category_id: z
    .string()
    .nullable()
    .refine((val) => val === null || val.length > 0, {
      message: "Invalid category selected.",
    }),
  product_unit_name: z.string().min(1, { message: "Unit is required." }).nullable(),
  quantity: z.number().min(1, { message: "Quantity must be at least 1." }),
  unit_sale_price: z.number().min(0, { message: "Sale price must be non-negative." }),
  unit_purchase_price_negotiated: z
    .number()
    .min(0, { message: "Purchase price must be non-negative." })
    .optional(),
  note: z.string().optional(),
});

export type ExternalSaleItemValues = z.infer<typeof externalSaleItemSchema>;

// --- EXTERNAL SALE FORM SCHEMA & TYPE WITH DATE FIELD ---
// Fix: ensure date is always Date, never undefined

export const externalSaleFormSchema = z.object({
  customerName: z.string().min(1, { message: "Customer name is required." }),
  customerPhone: z.string().optional(),
  items: z.array(externalSaleItemSchema),
  status: z.enum(["completed", "held"]),
  date: z.preprocess(
    (arg) => {
      // Accept Date object or ISO string, convert to Date
      let dt: Date | undefined;
      if (typeof arg === "string" || typeof arg === "number") {
        dt = new Date(arg);
      } else if (arg instanceof Date) {
        dt = arg;
      }
      return dt && !isNaN(dt.getTime()) ? dt : new Date();
    },
    z.date()
  ),
});

export type ExternalSaleFormValues = z.infer<typeof externalSaleFormSchema>;

// --- Manager Auth Types ---

export const managerAuthSchema = z.object({
  managerEmail: z.string().email({ message: "Invalid email address." }),
  authorizationCode: z.string().min(1, { message: "Authorization code is required." }),
  authorizedItems: z
    .array(
      z.object({
        tempId: z.string().uuid(),
        unit_purchase_price_negotiated: z.number().min(0, { message: "Purchase price must be non-negative." }),
      })
    )
    .min(1, { message: "Manager must set purchase prices for all items." }),
});

export type ManagerAuthValues = z.infer<typeof managerAuthSchema>;

// --- Type Definitions for Recent Sales Modal ---

export type SaleItemDetailsForRecentSales = {
  id: string;
  product_id?: string;
  quantity: number;
  unit_sale_price: number;
  total_price: number;
  note: string | null;
  products?: {
    id: string;
    name: string;
    unique_reference: string;
    product_unit_abbreviation: string | null;
    purchase_price?: number;
  } | null;
  product_name?: string;
  product_category_name?: string;
  product_unit_name?: string;
  unit_purchase_price_negotiated?: number;
  total_cost?: number;
  warehouse_selections?: WarehouseSelection[];
};

export type SaleRecordForRecentSales = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: "completed" | "held"; // Only allowed statuses
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    email: string;
    role?: string;
  } | null;
  branches: {
    id: string;
    name: string;
  } | null;
  sale_items: SaleItemDetailsForRecentSales[];
  saleType: "Sale" | "External Sale";
};

// --- Expense related types for POS ---
export type ExpenseCategoryForPos = {
  id: string;
  name: string;
  description: string | null;
};

export type ExpenseRecordForPos = {
  id: string;
  date: string;
  expense_category_id: string;
  description: string | null;
  amount: number;
  vendor_notes: string | null;
  branch_id: string;
  recorded_by_user_id: string;
  created_at: string;
  updated_at: string;
  expense_categories: { id: string; name: string; } | null;
  branches: { id: string; name: string; } | null;
  users: { id: string; email: string; } | null;
};

// --- Branch type for filter/selection (for POS and admin/manager workflows) ---
export type BranchForFilter = {
  id: string;
  name: string;
};   