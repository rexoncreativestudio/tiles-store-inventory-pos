// src/app/dashboard/accounting/types.ts

// --- Data types fetched directly from the database ---

/**
 * Represents sales data structured for accounting purposes.
 * Includes nested data for branches and sale items to calculate COGS.
 */
export type SaleDataForAccounting = {
    sale_date: string;
    total_amount: number;
    branch_id: string;
    branches: { id: string; name: string; } | null;
    sale_items?: Array<{ quantity?: number; products?: { purchase_price?: number; }; }>;
};

/**
 * Represents purchase data structured for accounting purposes.
 * Includes nested branch information.
 */
export type PurchaseDataForAccounting = {
    purchase_date: string;
    total_cost: number;
    branch_id: string | null;
    branches: { id: string; name: string; } | null;
};

/**
 * Represents external sales data, including both income and cost of goods.
 */
export type ExternalSaleDataForAccounting = {
    sale_date: string;
    total_amount: number; // Sale income
    total_cost: number;   // Cost of external sale items
    branch_id: string;
    branches: { id: string; name: string; } | null;
};

/**
 * Represents expense data, including related branch, category, and user info.
 * The user object is nested under the foreign key column name.
 */
export type ExpenseDataForAccounting = {
    id: string;
    date: string;
    amount: number;
    branch_id: string;
    branches: { id: string; name: string; } | null;
    expense_category_id: string;
    expense_categories: { id: string; name: string; } | null;
    recorded_by_user_id: { id: string; email: string; } | null;
};

/**
 * Represents product details needed for inventory valuation.
 */
export type ProductForInventory = {
  id: string;
  name: string;
  unique_reference: string;
  purchase_price: number;
};

/**
* Represents the stock details for a single product in a warehouse.
*/
export type StockDetailForInventory = {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  warehouses: { id: string; name: string; } | null;
  products: ProductForInventory | null;
};

/**
* Represents a warehouse, used for inventory breakdowns.
*/
export type WarehouseForInventory = {
  id: string;
  name: string;
  location: string | null;
};

/**
 * A simple type for populating branch selection dropdowns.
 */
export type BranchForSelect = {
  id: string;
  name: string;
};


// --- Summary Types (Calculated on the client-side) ---

/**
 * Represents the overall financial summary for the selected period.
 */
export type FinancialSummary = {
    total_sales_income: number;
    total_purchases_cost: number;
    total_expenses_amount: number;
    overall_net_profit: number;
};

/**
 * Represents the financial summary for a single branch.
 */
export type BranchFinancialSummary = {
    id: string;
    name: string;
    total_sales_income: number;
    total_purchases_cost: number;
    total_expenses_amount: number;
    net_profit: number;
};

/**
 * Represents the overall inventory summary.
 */
export type InventorySummary = {
    total_inventory_cost: number;
    total_unique_products_in_stock: number;
    total_stock_quantity: number;
};

/**
 * Represents the inventory breakdown for a single warehouse.
 */
export type WarehouseInventoryBreakdown = {
    id: string;
    name: string;
    total_inventory_cost: number;
    total_unique_products: number;
    total_stock_quantity: number;
};
