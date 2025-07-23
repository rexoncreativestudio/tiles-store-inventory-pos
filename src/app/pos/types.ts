import { z } from 'zod';

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

export interface CartItem {
  id: string;
  name: string;
  unique_reference: string;
  quantity: number;
  unit_sale_price: number;
  total_line_price: number;
  note?: string;
  image_url?: string | null;
}

export const externalSaleItemSchema = z.object({
  tempId: z.string().uuid(),
  product_name: z.string().min(1, { message: "Product name is required." }),
  product_category_id: z.string().uuid({ message: "Invalid category selected." }).nullable(),
  product_unit_name: z.string().min(1, { message: "Unit is required." }).nullable(),
  quantity: z.number().min(1, { message: "Quantity must be at least 1." }),
  unit_sale_price: z.number().min(0, { message: "Sale price must be non-negative." }),
  unit_purchase_price_negotiated: z.number().min(0, { message: "Purchase price must be non-negative." }).optional(),
  note: z.string().optional(),
});

export type ExternalSaleItemValues = z.infer<typeof externalSaleItemSchema>;

export const externalSaleFormSchema = z.object({
  customerName: z.string().min(1, { message: "Customer name is required." }),
  customerPhone: z.string().optional(),
  items: z.array(externalSaleItemSchema),
});

export type ExternalSaleFormValues = z.infer<typeof externalSaleFormSchema>;

export const managerAuthSchema = z.object({
  managerEmail: z.string().email({ message: "Invalid email address." }),
  authorizationCode: z.string().min(1, { message: "Authorization code is required." }),
  authorizedItems: z.array(z.object({
    tempId: z.string().uuid(),
    unit_purchase_price_negotiated: z.number().min(0, { message: "Purchase price must be non-negative." }),
  })).min(1, { message: "Manager must set purchase prices for all items." }),
});

export type ManagerAuthValues = z.infer<typeof managerAuthSchema>;