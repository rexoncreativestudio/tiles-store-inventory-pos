export type ProductForStock = {
  id: string;
  name: string;
  unique_reference: string;
  low_stock_threshold: number;
  product_unit_abbreviation: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
};

export type ProductStockDetail = {
  product_id: string;
  quantity: number;
  warehouse_id: string;
  warehouses: {
    id: string;
    name: string;
  } | null;
};

export type WarehouseForFilter = {
  id: string;
  name: string;
};

export interface StockManagementClientProps {
  products: ProductForStock[];         // paginated products
  allProducts: ProductForStock[];      // all products for search
  stockDetails: ProductStockDetail[];
  warehouses: WarehouseForFilter[];
  totalProductsCount: number;
  initialPage: number;
  initialItemsPerPage: number;
}