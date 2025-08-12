export type SaleStatus = 'completed' | 'held' | 'cancelled' | 'pending_approval' | string;

export type ProductForSaleItem = {
  id: string;
  name: string;
  unique_reference: string;
  product_unit_abbreviation: string | null;
  sale_price?: number;
  purchase_price?: number;
};

export type SaleItemDetails = {
  id: string;
  product_id: string;
  quantity: number;
  unit_sale_price: number;
  total_price: number;
  note: string | null;
  products: ProductForSaleItem | null;
};

export type SaleRecord = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: SaleStatus;
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: { id: string; email: string } | null;
  branches: { id: string; name: string } | null;
  sale_items: SaleItemDetails[];
};

export type UserForSelect = {
  id: string;
  email: string;
};

export type BranchForSelect = {
  id: string;
  name: string;
};

export type SaleRecordForEdit = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: SaleStatus;
  transaction_reference: string;
  sale_items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_sale_price: number;
    note: string | null;
    total_price: number;
  }[];
};

export type ExternalSaleItem = {
  id: string;
  product_name: string;
  product_category_name: string | null;
  product_unit_name: string;
  quantity: number;
  unit_sale_price: number;
  unit_purchase_price_negotiated: number;
  total_cost: number;
  total_price: number;
  note: string | null;
};

export type ExternalSaleItemForEdit = {
  id: string;
  product_name: string;
  product_category_name: string | null;
  product_unit_name: string;
  quantity: number;
  unit_sale_price: number;
  unit_purchase_price_negotiated: number;
  total_cost: number;
  total_price: number;
  note: string | null;
};

export type ExternalSaleRecord = {
  id: string;
  sale_date: string;
  cashier_id: string | null;
  branch_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: SaleStatus;
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: { id: string; email: string } | null;
  branches: { id: string; name: string } | null;
  external_sale_items: ExternalSaleItem[];
};

export type ExternalSaleRecordForEdit = {
  id: string;
  sale_date: string;
  cashier_id: string | null;
  branch_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: SaleStatus;
  transaction_reference: string;
  external_sale_items: ExternalSaleItemForEdit[];
};