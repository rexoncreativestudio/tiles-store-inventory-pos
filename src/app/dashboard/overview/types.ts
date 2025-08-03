// src/app/dashboard/overview/types.ts

// --- Basic Data Types from DB ---

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  branch_id?: string | null;
};

export type BranchData = {
  id: string;
  name: string;
};

export type WarehouseData = {
  id: string;
  name: string;
  location: string | null;
};

export type ProductData = {
  id: string;
  name: string;
  purchase_price: number;
};

// --- Transaction Data for Financial Calculations ---

export type SaleItemData = {
  quantity: number;
  products: { purchase_price?: number } | null;
};

export type SaleData = {
  sale_date: string;
  total_amount: number;
  branch_id: string;
  branches: { id: string; name: string } | null;
  sale_items?: SaleItemData[];
};

// --- START: CORRECTED PURCHASE TYPE ---
// Simplified to reflect the direct relationship with branches.
export type PurchaseData = {
  purchase_date: string;
  total_cost: number;
  branch_id: string | null;
  branches: { id: string; name: string } | null;
};
// --- END: CORRECTED PURCHASE TYPE ---

export type ExternalSaleData = {
  sale_date: string;
  total_amount: number;
  branch_id: string;
  branches?: { id: string; name: string };
  external_sale_items?: { total_cost: number }[];
};

// --- START: CORRECTED EXPENSE TYPE ---
// Added the 'users' property to hold the joined user data.
export type ExpenseData = {
  date: string;
  amount: number;
  branch_id: string;
  branches: { id: string; name: string } | null;
  users: { id: string; email: string; } | null;
};
// --- END: CORRECTED EXPENSE TYPE ---

// --- Stock Data for Inventory Report ---

export type StockData = {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  products: { purchase_price: number } | null;
  warehouses: { id: string; name: string } | null;
};

// --- Calculated Summary Types (Client-side) ---

export type DashboardSummaryCards = {
  total_revenue: number;
  net_profit: number;
  total_sales_count: number;
  total_inventory_value: number;
  total_unique_products_in_stock: number;
};

export type WarehouseBreakdownItem = {
  id: string;
  name: string;
  total_inventory_cost: number;
  product_count: number;
  total_stock_quantity: number;
};
