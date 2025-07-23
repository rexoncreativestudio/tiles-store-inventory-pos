// src/app/dashboard/products/types.ts

export type CategoryForProductForm = {
  id: string;
  name: string;
  unit_abbreviation: string | null; // This is the final, correct type
};

export type ProductItem = {
  id: string;
  name: string;
  unique_reference: string;
  description: string | null;
  category_id: string | null;
  product_unit_abbreviation: string | null; // This is the final, correct type for product's unit
  purchase_price: number;
  sale_price: number;
  is_active: boolean;
  low_stock_threshold: number;
  image_url: string | null;
  categories: { id: string; name: string; unit_abbreviation: string | null; } | null;
};

export type UnitForProductForm = {
  id: string;
  abbreviation: string;
  name: string;
};